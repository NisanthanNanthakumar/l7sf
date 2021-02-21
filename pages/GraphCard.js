import { Component } from "react";
import Select from "react-select";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";

import { add, format, differenceInCalendarDays } from "date-fns";

const dateFormatter = (date) => {
  return format(new Date(date), "dd/MMM");
};
/**
 * get the dates between `startDate` and `endSate` with equal granularity
 */
const getTicks = (startDate, endDate, num) => {
  const diffDays = differenceInCalendarDays(endDate, startDate);

  let current = startDate,
    velocity = Math.round(diffDays / (num - 1));

  const ticks = [startDate.getTime()];

  for (let i = 1; i < num - 1; i++) {
    ticks.push(add(current, { days: i * velocity }).getTime());
  }

  ticks.push(endDate.getTime());
  return ticks;
};

const dataKeyOptions = [{ value: "rent/sqft", label: "Rent/SqFt" }];
const filterKeyOptions = [
  { value: "LEASED", label: "Leased" },
  { value: "AVAILABLE_READY", label: "Available" },
];
const initialState = {
  data: [],
  left: "dataMin",
  right: "dataMax",
  refAreaLeft: "",
  refAreaRight: "",
  ticks: [],
  selectedDataKeyOption: null,
  selectedFilterKeyOptions: [],
};

class GraphCard extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  componentDidMount() {
    const { floorPlan, units, unitHistory, onChange } = this.props;
    console.log({unitHistory})
    if (!unitHistory) {
      return;
    }

    const data = unitHistory
      .filter((unit) => unit.rentModifiedTimestamp && unit.rent)
      .sort(
        (a, b) =>
          new Date(a.rentModifiedTimestamp) - new Date(b.rentModifiedTimestamp)
      )
      .map((unit) => ({
        ...unit,
        rentModifiedTimestamp: new Date(unit.rentModifiedTimestamp).getTime(),
      }));

    const ticks =
      (data.length > 0 &&
        getTicks(
          new Date(data[0].rentModifiedTimestamp),
          new Date(data[data.length - 1].rentModifiedTimestamp),
          5
        )) ||
      [];

    this.setState({ mountedData: data, data, ticks });
  }

  zoom() {
    let { refAreaLeft, refAreaRight, data } = this.state;
    if (refAreaLeft === refAreaRight || refAreaRight === "") {
      this.setState(() => ({
        refAreaLeft: "",
        refAreaRight: "",
      }));
      return;
    }

    // xAxis domain
    if (refAreaLeft > refAreaRight)
      [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];

    if (
      (refAreaLeft || refAreaLeft === 0) &&
      (refAreaRight || refAreaRight === 0)
    ) {
      this.setState({
        left: data[refAreaLeft].rentModifiedTimestamp,
        right: data[refAreaRight].rentModifiedTimestamp,
        ticks: getTicks(
          new Date(data[refAreaLeft].rentModifiedTimestamp),
          new Date(data[refAreaRight].rentModifiedTimestamp),
          5
        ),
      });
    }
    this.setState({
      refAreaLeft: "",
      refAreaRight: "",
    });
  }

  zoomOut() {
    const { data } = this.state;
    this.setState(() => ({
      refAreaLeft: "",
      refAreaRight: "",
      left: "dataMin",
      right: "dataMax",
      ticks: getTicks(
        new Date(data[0].rentModifiedTimestamp),
        new Date(data[data.length - 1].rentModifiedTimestamp),
        5
      ),
    }));
  }

  setDataKeyOption(option) {
    this.setState({ selectedDataKeyOption: option });
  }
  setFilterKeyOptions(options) {
    const { mountedData } = this.state;
    let filters = (options || []).map((o) => o.value);
    let filteredData = mountedData.filter(
      (unit) => !filters.includes(unit.leaseStatus)
    );
    let ticks =
      (filteredData.length > 0 &&
        getTicks(
          new Date(filteredData[0].rentModifiedTimestamp),
          new Date(filteredData[filteredData.length - 1].rentModifiedTimestamp),
          5
        )) ||
      [];
    this.setState({
      selectedFilterKeyOptions: options,
      data: filteredData,
      ticks,
    });
  }

  render() {
    const { onChange } = this.props;
    const {
      data,
      ticks,
      left,
      right,
      refAreaLeft,
      refAreaRight,
      selectedDataKeyOption,
      selectedFilterKeyOptions,
    } = this.state;

    const showRentSqFt =
      selectedDataKeyOption && selectedDataKeyOption.value === "rent/sqft";
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 0.4fr",
        }}
      >
        {!data.length ? (
          <div>Rent history not available for this floorplan.</div>
        ) : (
          <LineChart
            width={700}
            height={300}
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            onMouseDown={(e) =>
              e && this.setState({ refAreaLeft: e.activeTooltipIndex })
            }
            onMouseMove={(e) =>
              e &&
              this.state.refAreaLeft &&
              this.setState({ refAreaRight: e.activeTooltipIndex })
            }
            onMouseUp={() => this.zoom()}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              allowDataOverflow
              dataKey="rentModifiedTimestamp"
              hasTick
              scale="time"
              tickFormatter={dateFormatter}
              type="number"
              domain={[left, right]}
              ticks={ticks}
            />
            <YAxis allowDataOverflow yAxisId="1" type="number" />
            {showRentSqFt && (
              <YAxis
                allowDataOverflow
                yAxisId="2"
                type="number"
                orientation="right"
              />
            )}
            <Tooltip content={<CustomTooltip onChange={onChange} />} />
            <Legend />
            <Line
              yAxisId="1"
              type="monotone"
              dataKey="rent"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              animationDuration={300}
            />
            {showRentSqFt && (
              <Line
                yAxisId="2"
                type="monotone"
                dataKey="rent/sqft"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
                animationDuration={300}
              />
            )}
            {(refAreaLeft || refAreaLeft === 0) &&
            (refAreaRight || refAreaRight === 0) ? (
              <ReferenceArea
                yAxisId="1"
                x1={data[refAreaLeft].rentModifiedTimestamp}
                x2={data[refAreaRight].rentModifiedTimestamp}
                strokeOpacity={0.3}
              />
            ) : null}
          </LineChart>
        )}
        <div style={{ width: "100%", padding: "0.5rem 3rem 0 0" }}>
          <button
            style={{
              border: "1px solid grey",
              borderRadius: "5px",
              padding: "6px 10px",
              backgroundColor: "rgb(255, 255, 255)",
              boxShadow:
                "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.12) 0px 1px 1px 0px, rgba(60, 66, 87, 0.16) 0px 0px 0px 1px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(60, 66, 87, 0.08) 0px 2px 5px 0px",
            }}
            onClick={() => this.zoomOut()}
          >
            Zoom Out
          </button>
          <p>Compare:</p>
          <Select
            className="basic-single"
            classNamePrefix="select"
            defaultValue={selectedDataKeyOption}
            name="dataKeys"
            options={dataKeyOptions}
            onChange={(option) => this.setDataKeyOption(option)}
            isClearable
            style={{ width: "300px" }}
          />
          <p>Exclude:</p>
          <Select
            defaultValue={selectedFilterKeyOptions}
            isMulti
            name="filterKeys"
            options={filterKeyOptions}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={(options) => this.setFilterKeyOptions(options)}
            style={{ width: "300px" }}
          />
        </div>
      </div>
    );
  }
}

const CustomTooltip = (props) => {
  const { active, payload, onChange } = props;
  if (active) {
    const currData = payload && payload.length ? payload[0].payload : null;
    onChange(currData);
    return (
      <div
        className="area-chart-tooltip"
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ccc",
          color: "#8884d8",
          padding: 6,
        }}
      >
        <p style={{ color: "grey" }}>
          {currData
            ? format(new Date(currData.rentModifiedTimestamp), "MMM dd,yyyy")
            : " -- "}
        </p>
        <p>{`Rent: $${currData ? currData.rent : " -- "}`}</p>
        <p style={{ color: "#82ca9d" }}>{`Rent/SqFt: $${
          currData ? currData["rent/sqft"].toFixed(2) : " -- "
        }`}</p>
      </div>
    );
  }

  return null;
};

export default GraphCard;
