const fs = require("fs").promises;
const axios = require("axios");

const crawlAndSave = async () => {
  try {
    console.log("running crawlAndSave")
    let stringdata = await fs.readFile(__dirname + "/data.json", "utf-8");
    let data = JSON.parse(stringdata);
    let resp = await axios.get(
      "https://www.l7sf.com/CmsSiteManager/callback.aspx?act=Proxy/GetUnits&honordisplayorder=true&siteid=8207152&bestprice=false&leaseterm=3&leaseterm=4&leaseterm=5&leaseterm=6&leaseterm=7&leaseterm=8&leaseterm=9&leaseterm=10&leaseterm=11&leaseterm=12&leaseterm=13&leaseterm=14&leaseterm=15&leaseterm=16&leaseterm=17&leaseterm=18&leaseterm=19&leaseterm=20&leaseterm=21&leaseterm=22&leaseterm=23&leaseterm=24&dateneeded=2020-11-29"
    );
    resp.data.units.map((unit) => {
      if (data[unit.id]) {
        let unitHistory = data[unit.id];
        if (unitHistory[unitHistory.length - 1].rent !== unit.rent) {
          data[unit.id].push(unit);
        }
      } else {
        data[unit.id] = [unit];
      }
      return;
    });
    await fs.writeFile(__dirname + "/data.json", JSON.stringify(data));
  } catch (e) {
    console.log(e);
  }
};

crawlAndSave();
