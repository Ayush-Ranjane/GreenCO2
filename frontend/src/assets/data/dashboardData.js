const dashboardData = {
  company: "GreenCO2 Industries",

  summary: {
    total_co2: 12540,
    total_fuel: 4680,
    status: "Within Limits"
  },

  trends: [
    { month: "Jan", co2: 2100 },
    { month: "Feb", co2: 1900 },
    { month: "Mar", co2: 2300 },
    { month: "Apr", co2: 2500 },
    { month: "May", co2: 2200 },
    { month: "Jun", co2: 2540 }
  ],

  alerts: [
    { type: "warning", message: "Fuel usage increased by 12%" },
    { type: "danger", message: "CO₂ nearing compliance limit" }
  ]
};

export default dashboardData;