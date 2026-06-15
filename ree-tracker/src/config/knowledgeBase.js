// src/config/knowledgeBase.js

// 1. ACRONYMS & DEFINITIONS (Used by SmartText.jsx for hover tooltips)
export const DICTIONARY = {
  "EPIRA": "Electric Power Industry Reform Act of 2001 (RA 9136)",
  "PEC": "Philippine Electrical Code",
  "NEC": "National Electrical Code",
  "KAIC": "Kilo Ampere Interrupting Capacity",
  "BEMS": "Building Energy Management System",
  "NBERIC": "National Bioenergy Research and Innovation Center",
  "X/R Ratio": "Ratio of system reactance to resistance; determines asymmetrical fault current."
};

// 2. ENGINEERING CONSTANTS (Used by ConstantsMatrix.jsx and SmartText.jsx)
// Note: We attach a "keyword" so the SmartText parser knows exactly what to look for!
export const EE_CONSTANTS = [
  // Physical Constants
  { category: 'Physical Constants', name: 'Permittivity of Free Space ($\\varepsilon_0$)', value: '$8.854 \\times 10^{-12}$ F/m', keyword: 'permittivity' },
  { category: 'Physical Constants', name: 'Permeability of Free Space ($\\mu_0$)', value: '$4\\pi \\times 10^{-7}$ H/m', keyword: 'permeability' },
  { category: 'Physical Constants', name: 'Electron Charge ($e$)', value: '$1.602 \\times 10^{-19}$ C', keyword: 'electron charge' },
  { category: 'Physical Constants', name: 'Electron Mass ($m_e$)', value: '$9.109 \\times 10^{-31}$ kg', keyword: 'electron mass' },
  { category: 'Physical Constants', name: 'Proton Mass ($m_p$)', value: '$1.672 \\times 10^{-27}$ kg', keyword: 'proton mass' },
  { category: 'Physical Constants', name: 'Planck\'s Constant ($h$)', value: '$6.626 \\times 10^{-34}$ J$\\cdot$s', keyword: 'planck constant' },
  { category: 'Physical Constants', name: 'Speed of Light ($c$)', value: '$2.998 \\times 10^8$ m/s', keyword: 'speed of light' },

  // Equipment Standards (PEC / NEMA)
  { category: 'Equipment Standards', name: 'Standard Transformer Sizes (1-Phase)', value: '3, 5, 10, 15, 25, 37.5, 50, 75, 100, 167, 250, 333, 500 kVA' },
  { category: 'Equipment Standards', name: 'Standard Transformer Sizes (3-Phase)', value: '15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000 kVA' },
  { category: 'Equipment Standards', name: 'Standard Motor Ratings (HP)', value: '1/2, 3/4, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50 HP' },
  { category: 'Equipment Standards', name: 'Standard Circuit Breaker Ratings', value: '15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200 A' },

  // PEC Wiring (THHN / THWN) Copper Ampacities at 90°C
  { category: 'PEC Wiring (THHN)', name: '2.0 mm² (14 AWG) Cu Ampacity', value: '25 A' },
  { category: 'PEC Wiring (THHN)', name: '3.5 mm² (12 AWG) Cu Ampacity', value: '30 A' },
  { category: 'PEC Wiring (THHN)', name: '5.5 mm² (10 AWG) Cu Ampacity', value: '40 A' },
  { category: 'PEC Wiring (THHN)', name: '8.0 mm² (8 AWG) Cu Ampacity', value: '55 A' },
  { category: 'PEC Wiring (THHN)', name: '14.0 mm² (6 AWG) Cu Ampacity', value: '75 A' },
  { category: 'PEC Wiring (THHN)', name: '22.0 mm² (4 AWG) Cu Ampacity', value: '95 A' },
  { category: 'PEC Wiring (THHN)', name: '30.0 mm² (2 AWG) Cu Ampacity', value: '130 A' },
  { category: 'PEC Wiring (THHN)', name: '38.0 mm² (1 AWG) Cu Ampacity', value: '150 A' },
  { category: 'PEC Wiring (THHN)', name: '50.0 mm² (1/0 AWG) Cu Ampacity', value: '170 A' },

  // Philippine Regulatory & Laws
  { category: 'Regulatory', name: 'Philippine Electrical Engineering Law', value: 'RA 7920' },
  { category: 'Regulatory', name: 'EPIRA (Electric Power Industry Reform)', value: 'RA 9136' },
  { category: 'Regulatory', name: 'RE Act (Renewable Energy Act)', value: 'RA 9513' },
  { category: 'Regulatory', name: 'Anti-Pilferage Act of 1994', value: 'RA 7832' },
  { category: 'Regulatory', name: 'National Building Code of the Philippines', value: 'PD 1096' },

  // Conversions (Electrical & Magnetic)
  { category: 'Conversions', name: '1 Horsepower (Electrical)', value: '746 W' },
  { category: 'Conversions', name: '1 Horsepower (Metric)', value: '735.5 W' },
  { category: 'Conversions', name: '1 Horsepower (Boiler)', value: '9,809.5 W' },
  { category: 'Conversions', name: '1 Weber (Wb)', value: '$10^8$ Maxwells (Mx)' },
  { category: 'Conversions', name: '1 Tesla (T)', value: '$10^4$ Gauss (G)' },
  { category: 'Conversions', name: '1 Ampere-turn (AT)', value: '1.257 Gilberts (Gb)' },

  // Conversions (Energy, Power & Thermodynamics)
  { category: 'Conversions', name: '1 Joule (J)', value: '$10^7$ ergs' },
  { category: 'Conversions', name: '1 Electron-volt (eV)', value: '$1.602 \\times 10^{-19}$ J' },
  { category: 'Conversions', name: '1 kWh', value: '3,600,000 J (or 3,412 BTU)' },
  { category: 'Conversions', name: '1 BTU', value: '1055 J (or 252 cal)' },
  { category: 'Conversions', name: '1 Ton of Refrigeration (TR)', value: '12,000 BTU/hr (or 3.517 kW)' },
  { category: 'Conversions', name: '1 Calorie (cal)', value: '4.184 J' }
];
