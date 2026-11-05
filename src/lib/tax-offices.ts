// Customer service units nationwide, from the NRS Customer Service Quality Assurance Unit list
// "TAXPAYER SERVICE UNITS NATIONWIDE" (grouped by state; Lagos merges its three State Administrations).
// The saved form value is "<unit>, <state>", e.g. "ETO Garki, FCT".

type StateOffices = {
  /** Saved in the response, after the unit name */
  state: string
  /** Shown in the State dropdown */
  label: string
  offices: string[]
}

export const TAX_OFFICES: StateOffices[] = [
  {
    state: "Abia",
    label: "Abia",
    offices: [
      "GBTO Abia",
      "ETO Abia",
      "ETO Osisioma (Abia)",
      "ETO Umuahia (Abia)",
    ],
  },
  {
    state: "Adamawa",
    label: "Adamawa",
    offices: [
      "GBTO Adamawa",
      "ETO Yola",
      "STO Mubi",
    ],
  },
  {
    state: "Akwa Ibom",
    label: "Akwa Ibom",
    offices: [
      "GBTO Akwa Ibom",
      "ETO Eket (Akwa Ibom)",
      "ETO Uyo (Akwa Ibom)",
      "STO Ikot Ekpene",
    ],
  },
  {
    state: "Anambra",
    label: "Anambra",
    offices: [
      "GBTO Anambra",
      "LTO Awka",
      "ETO Awka",
      "ETO Nkpor",
      "ETO Nnewi",
      "ETO Onitsha",
    ],
  },
  {
    state: "Bauchi",
    label: "Bauchi",
    offices: [
      "GBTO Bauchi",
      "ETO Azare",
      "ETO Bauchi",
    ],
  },
  {
    state: "Bayelsa",
    label: "Bayelsa",
    offices: [
      "GBTO Bayelsa",
      "ETO Yenagoa (Bayelsa)",
    ],
  },
  {
    state: "Benue",
    label: "Benue",
    offices: [
      "Gboko STO",
      "GBTO Benue",
      "STO Otukpo",
      "ETO Makurdi",
    ],
  },
  {
    state: "Borno",
    label: "Borno",
    offices: [
      "GBTO Borno",
      "ETO Maiduguri",
    ],
  },
  {
    state: "Cross River",
    label: "Cross River",
    offices: [
      "GBTO Cross River",
      "ETO Calabar",
      "ETO Ikom",
    ],
  },
  {
    state: "Delta",
    label: "Delta",
    offices: [
      "GBTO Delta",
      "ETO Agbor",
      "ETO Asaba",
      "ETO Sapele",
      "ETO Warri",
      "MTO Warri",
    ],
  },
  {
    state: "Ebonyi",
    label: "Ebonyi",
    offices: [
      "GBTO Ebonyi",
      "ETO Abakaliki",
      "STO Afikpo",
    ],
  },
  {
    state: "Edo",
    label: "Edo",
    offices: [
      "GBTO Edo",
      "ETO Auchi",
      "ETO Benin",
    ],
  },
  {
    state: "Ekiti",
    label: "Ekiti",
    offices: [
      "GBTO Ekiti",
      "ETO Ado Ekiti",
    ],
  },
  {
    state: "Enugu",
    label: "Enugu",
    offices: [
      "GBTO Enugu",
      "ETO 9th Mile",
      "ETO Enugu",
      "MTO Enugu",
    ],
  },
  {
    state: "FCT",
    label: "FCT (Abuja)",
    offices: [
      "GBTO Abuja",
      "Gwarimpa ETO",
      "LTO Abuja",
      "LTO Oil and Gas Abuja",
      "ETO Asokoro",
      "ETO Central Area",
      "ETO Garki",
      "ETO Garki II",
      "ETO Gwagwalada",
      "ETO Kubwa",
      "ETO Lugbe",
      "ETO Mabushi",
      "ETO Maitama",
      "ETO Utako",
      "ETO Wuse",
      "ETO Wuse II",
      "ETO Wuse III",
      "MTO Abuja",
    ],
  },
  {
    state: "Gombe",
    label: "Gombe",
    offices: [
      "GBTO Gombe",
      "ETO Gombe",
      "STO Kaltungo",
    ],
  },
  {
    state: "Imo",
    label: "Imo",
    offices: [
      "GBTO Imo",
      "ETO Orlu",
      "ETO Owerri",
      "STO Okigwe",
    ],
  },
  {
    state: "Jigawa",
    label: "Jigawa",
    offices: [
      "GBTO Jigawa",
      "ETO Dutse",
    ],
  },
  {
    state: "Kaduna",
    label: "Kaduna",
    offices: [
      "GBTO Kaduna",
      "MTO Kaduna",
      "ETO Kaduna I",
      "ETO Kaduna II",
      "ETO Kaduna III",
      "ETO Zaria (Kaduna)",
      "STO Kafanchan (Kaduna)",
    ],
  },
  {
    state: "Kano",
    label: "Kano",
    offices: [
      "GBTO Kano",
      "LTO Kano",
      "ETO Kano I",
      "ETO Kano II",
      "ETO Kano III",
      "MTO Kano",
    ],
  },
  {
    state: "Katsina",
    label: "Katsina",
    offices: [
      "GBTO Katsina",
      "ETO Funtua",
      "ETO Katsina",
    ],
  },
  {
    state: "Kebbi",
    label: "Kebbi",
    offices: [
      "GBTO Kebbi",
      "ETO Birnin Kebbi",
    ],
  },
  {
    state: "Kogi",
    label: "Kogi",
    offices: [
      "GBTO Kogi",
      "ETO Lokoja",
      "STO Anyigba",
    ],
  },
  {
    state: "Kwara",
    label: "Kwara",
    offices: [
      "GBTO Kwara",
      "ETO Ilorin",
      "STO Offa",
    ],
  },
  {
    state: "Lagos",
    label: "Lagos",
    offices: [
      "EC Special Tax Unit",
      "LTO Aviation Construction and others",
      "LTO Downstream",
      "LTO Financial Services",
      "LTO Oil & Gas Midstream",
      "LTO Servicing",
      "LTO Telecoms and Broadcast",
      "LTO Upstream",
      "ETO Ajah",
      "ETO Ajah II",
      "ETO Bar Beach",
      "ETO Broad Street",
      "ETO Epe",
      "ETO Ikoyi",
      "ETO Ikoyi II",
      "ETO Onikan",
      "ETO Victoria Island",
      "ETO Victoria Island II",
      "MTO II Lagos Island",
      "MTO Lagos Island",
      "Non-Residence Tax Office",
      "GBTO Lagos",
      "ETO Agege",
      "ETO Agidingbi",
      "ETO Alimosho",
      "ETO Ikeja",
      "ETO Ikeja II",
      "ETO Ikeja III",
      "ETO Ikorodu",
      "ETO Ilupeju I",
      "ETO Ilupeju II",
      "ETO Onigbongbo",
      "ETO Yaba",
      "MTO Lagos Mainland East",
      "Ojodu Berger ETO",
      "LTO Mainland",
      "ETO Aguda",
      "ETO Alaba",
      "ETO Apapa",
      "ETO Badagry",
      "ETO Festac",
      "ETO Isolo",
      "ETO Orile Iganmu",
      "ETO Surulere",
      "MTO Lagos Mainland West",
    ],
  },
  {
    state: "Nasarawa",
    label: "Nasarawa",
    offices: [
      "GBTO Nasarawa",
      "ETO Keffi",
      "ETO Lafia",
      "ETO New Karu",
    ],
  },
  {
    state: "Niger",
    label: "Niger",
    offices: [
      "GBTO Niger",
      "ETO Bida",
      "ETO Minna",
      "ETO Suleja",
    ],
  },
  {
    state: "Ogun",
    label: "Ogun",
    offices: [
      "Agbara STO",
      "GBTO Ogun",
      "ETO Abeokuta",
      "ETO Ota",
      "ETO Shagamu",
      "STO Ijebu Ode",
    ],
  },
  {
    state: "Ondo",
    label: "Ondo",
    offices: [
      "GBTO Ondo",
      "ETO Akure",
      "ETO Ikare",
      "ETO Ore",
    ],
  },
  {
    state: "Osun",
    label: "Osun",
    offices: [
      "GBTO Osun",
      "Ife STO",
      "ETO Osogbo",
      "STO Ilesha",
    ],
  },
  {
    state: "Oyo",
    label: "Oyo",
    offices: [
      "GBTO Oyo",
      "LTO Ibadan",
      "ETO Adeoyo",
      "ETO Iwo Road",
      "ETO Oyo",
      "MTO Ibadan",
      "STO Ogbomosho",
    ],
  },
  {
    state: "Plateau",
    label: "Plateau",
    offices: [
      "GBTO Plateau",
      "ETO Jos (Plateau)",
      "STO Shendam (Plateau)",
    ],
  },
  {
    state: "Rivers",
    label: "Rivers",
    offices: [
      "GBTO Rivers",
      "LTO Oil & Gas Port-Harcourt",
      "LTO Port-Harcourt",
      "ETO Bonny Island",
      "ETO II Port-Harcourt",
      "ETO III Port-Harcourt",
      "ETO Onne",
      "ETO Port-Harcourt",
      "ETO Rumueme",
      "ETO Rumuokwurushi II",
      "ETO Rumuokwurushi III",
      "ETO Rumuokwurushi",
      "MTO Port-Harcourt",
      "STO Ahoada",
    ],
  },
  {
    state: "Sokoto",
    label: "Sokoto",
    offices: [
      "GBTO Sokoto",
      "ETO Sokoto",
    ],
  },
  {
    state: "Taraba",
    label: "Taraba",
    offices: [
      "GBTO Taraba",
      "ETO Jalingo",
    ],
  },
  {
    state: "Yobe",
    label: "Yobe",
    offices: [
      "GBTO Yobe",
      "ETO Damaturu",
    ],
  },
  {
    state: "Zamfara",
    label: "Zamfara",
    offices: [
      "GBTO Zamfara",
      "ETO Gusau",
    ],
  },
]

export function formatTaxOffice(state: string, office: string) {
  return `${office}, ${state}`
}

const VALID_VALUES = new Set(
  TAX_OFFICES.flatMap((s) => s.offices.map((o) => formatTaxOffice(s.state, o)))
)

export function isValidTaxOffice(value: string) {
  return VALID_VALUES.has(value)
}
