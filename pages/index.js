import Head from "next/head";
import Select from "react-select";
import styles from "../styles/Home.module.css";

import data from "../data/data.json";
import { useState } from "react";
import Modal from "react-modal";
import GraphCard from "./GraphCard";

const bedOptions = [
  { value: 0, label: "S" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
];

const bathOptions = [
  { value: 1.0, label: "1" },
  { value: 1.5, label: "1.5" },
  { value: 2.0, label: "2" },
  { value: 2.5, label: "2.5" },
];

const orderByOptions = [
  { value: "Total Units", label: "Total Units ↘" },
  { value: "Available", label: "Available ↘" },
  { value: "Leased", label: "Leased ↘" },
];

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "fit-content",
    minWidth: "calc(700px + 280px)",
    minHeight: "calc(340px)",
  },
};

export default function Home() {
  const [selectedBedOptions, setBedOptions] = useState(bedOptions);
  const [selectedBathOptions, setBathOptions] = useState(bathOptions);
  const [selectedFloorplan, setSelectedFloorplan] = useState(null);
  const [orderByOption, setOrderByOption] = useState(null);

  const selectedBaths = selectedBathOptions
    ? selectedBathOptions.map((option) => option.value)
    : [];
  const selectedBeds = selectedBedOptions
    ? selectedBedOptions.map((option) => option.value)
    : [];

  const convertRaw = (unit) => ({
    unitNumber: unit.unitNumber,
    leaseStatus: unit.leaseStatus,
    numberOfBeds: unit.numberOfBeds,
    numberOfBaths: unit.numberOfBaths,
    rent: unit.rent || null,
    squareFeet: unit.squareFeet || null,
    "rent/sqft": unit.rent / unit.squareFeet,
    rentModifiedTimestamp: unit.rentModifiedTimestamp,
    floorPlan: unit.floorPlanImages.length
      ? unit.floorPlanImages[0].httpsSrc.replace('%s', '640x640')
      : null,
    minLeaseTermInMonth: unit.minLeaseTermInMonth || null,
    maxLeaseTermInMonth: unit.maxLeaseTermInMonth || null,
  })

  const getUnitHistory = selectedFloorplan => {
    return Object.values(data).reduce((acc, curr) => {
      let floorPlan = curr[0].floorPlanImages.length
      ? curr[0].floorPlanImages[0].httpsSrc.replace('%s', '640x640')
      : null
      if ( floorPlan === selectedFloorplan) {
        acc.push(...curr)
      }
      return acc;
    },[]).map(convertRaw)
  }

  const allUnits = Object.values(data).map(
    (entries) => entries[entries.length - 1]
  );
  const units = allUnits
    .filter((unit) => {
      return (
        selectedBaths.includes(unit.numberOfBaths) &&
        selectedBeds.includes(unit.numberOfBeds)
      );
    })
    .map(convertRaw)
    .sort((a, b) => a.squareFeet - b.squareFeet)
    .reduce((acc, curr) => {
      if (acc[curr.floorPlan]) {
        acc[curr.floorPlan].push(curr);
      } else {
        acc[curr.floorPlan] = [curr];
      }
      return acc;
    }, {});

  return (
    <div className={styles.container}>
      <Head>
        <title>L7SF Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(300px, max-content))",
            columnGap: "4rem",
            margin: "1rem 3rem 2rem",
          }}
        >
          <div>
            <h3>Beds</h3>
            <Select
              instanceId={"beds"}
              defaultValue={selectedBedOptions}
              isMulti
              name="beds"
              options={bedOptions}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={setBedOptions}
              style={{ width: "300px" }}
            />
          </div>
          <div>
            <h3>Baths</h3>
            <Select
            instanceId={"baths"}
              defaultValue={selectedBathOptions}
              isMulti
              name="baths"
              options={bathOptions}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={setBathOptions}
              style={{ width: "300px" }}
            />
          </div>
          <div>
            <h3>Order By</h3>
            <Select
            instanceId={"order"}
              className="basic-single"
              classNamePrefix="select"
              defaultValue={orderByOption}
              name="order"
              options={orderByOptions}
              onChange={setOrderByOption}
              isClearable
              style={{ width: "300px" }}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            justifyItems: "center",
            padding: "1rem",
          }}
        >
          {Object.entries(units)
            .sort((a, b) => {
              if (orderByOption) {
                if (orderByOption.value === "Total Units") {
                  return b[1].length - a[1].length;
                }
                if (orderByOption.value === "Available") {
                  return (
                    b[1].filter(
                      (unit) => unit.leaseStatus === "AVAILABLE_READY"
                    ).length -
                    a[1].filter(
                      (unit) => unit.leaseStatus === "AVAILABLE_READY"
                    ).length
                  );
                }
                if (orderByOption.value === "Leased") {
                  return (
                    b[1].filter((unit) => unit.leaseStatus === "LEASED")
                      .length -
                    a[1].filter((unit) => unit.leaseStatus === "LEASED").length
                  );
                }
              }
              return 1;
            })
            .map(([floorPlan, units]) => {
              console.log({floorPlan})
              return (
                <Card
                  floorPlan={floorPlan}
                  units={units}
                  key={floorPlan}
                  onClick={() => setSelectedFloorplan(floorPlan)}
                />
              );
            })}
        </div>
      </div>
      <Modal
        isOpen={!!selectedFloorplan}
        // onAfterOpen={afterOpenModal}
        onRequestClose={() => setSelectedFloorplan(null)}
        style={modalStyles}
        contentLabel="Example Modal"
        ariaHideApp={false} 
      >
        <DetailedView
          floorPlan={selectedFloorplan}
          units={units[selectedFloorplan] || []}
          unitHistory={getUnitHistory(selectedFloorplan)}
        />
      </Modal>
    </div>
  );
}

const Card = ({ floorPlan, units, ...rest }) => {
  const { numberOfBaths, numberOfBeds } = units[0];

  let squareftRange = `${units[0].squareFeet} - ${
    units[units.length - 1].squareFeet
  }SQFT`;
  return (
    <div
      {...rest}
      style={{
        width: "calc(100% - 10px)",
        height: "calc(100% - 10px)",
        border: "1px solid grey",
        borderRadius: "10px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <img
          src={floorPlan.replace("%s", "640x640")}
          style={{ width: "inherit" }}
        />
      </div>
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <div>{`AVAILABLE NOW: ${
          units.filter((unit) => unit.leaseStatus === "AVAILABLE_READY").length
        }`}</div>
        <div>{`${numberOfBeds} BD | ${numberOfBaths} BA | ${squareftRange}`}</div>
      </div>
    </div>
  );
};

const DetailedView = ({ floorplan, units, unitHistory }) => {
  const [highlighted, setHighlighted] = useState(units[0]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
      <div>
        <GraphCard
          floorPlan={floorplan}
          units={units}
          unitHistory={unitHistory}
          onChange={(data) => setHighlighted(data)}
        />
      </div>
      {/* <div>
        <div>{`TOTAL UNITS: ${units.length}`}</div>
        <div>{`LEASED: ${
          units.filter((unit) => unit.leaseStatus === "LEASED").length
        }`}</div>
        <div>{`AVAILABLE NOW: ${
          units.filter((unit) => unit.leaseStatus === "AVAILABLE_READY").length
        }`}</div>
      </div> */}
    </div>
  );
};
