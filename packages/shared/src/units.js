// Unit conversion: every category, unit and factor, with no network and no rates.
// Each unit is `factor` of its category's base, or a toBase/fromBase pair where the
// scale isn't linear (temperature, decibels). `system` is what the board cares
// about: converting between SI, other metric units and English ones. A conversion
// that only moves a prefix is obvious, so those units are marked `prefixed`, and
// stay out of the way in the "in other units" list.
//
// Lengths and masses use the exact international definitions. Heat uses the
// international calorie and BTU (4.1868 J, 1055.056 J), as steam tables do. A
// `note` carries each convention a problem might read differently.
//
// To add a unit, add a row. To add a quantity, add a category with `defaults` that
// cross systems, and known values in features/conversion/conversion.test.js.
// docs/UNITS_AND_TOOLS.md has the rest.
//
// Imported as @ree/shared/units and never re-exported from client.js, so it stays
// out of the boot download.

const row = (system) => (id, name, factor, note) => ({ id, name, factor, system, ...(note ? { note } : {}) });
const S = row('SI');
const M = row('Metric');
const E = row('English');
const O = row('Other');

const UNIT_SYSTEMS = [
    { id: 'SI', label: 'SI' },
    { id: 'Metric', label: 'Metric (not SI)' },
    { id: 'English', label: 'English' },
    { id: 'Other', label: 'Other' },
];

// The building blocks, each from its definition.
const FT = 0.3048;
const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216152605;
const G = 9.80665;
const KGF = G;
const FT_LBF = LBF * FT;
const BTU = 1055.05585262;
const CAL = 4.1868;
const KCAL = 4186.8;
const GAL = 3.785411784e-3;
const CMIL_MM2 = (Math.PI / 4) * IN ** 2;
const R_PER_K = 5 / 9;

const SCALE = { f: 1e-15, p: 1e-12, n: 1e-9, µ: 1e-6, m: 1e-3, c: 1e-2, '': 1, k: 1e3, M: 1e6, G: 1e9, T: 1e12 };
const WORD = { f: 'Femto', p: 'Pico', n: 'Nano', µ: 'Micro', m: 'Milli', c: 'Centi', k: 'Kilo', M: 'Mega', G: 'Giga', T: 'Tera' };
const si = (symbol, name, prefixes) => prefixes.map((p) => ({
    id: `${p}${symbol}`,
    name: WORD[p] ? `${WORD[p]}${name.toLowerCase()}` : name,
    factor: SCALE[p],
    system: 'SI',
    ...(p ? { prefixed: true } : {}),
}));

const UNIT_GROUPS = [
    { id: 'mechanics', label: 'Mechanics' },
    { id: 'thermo', label: 'Thermodynamics' },
    { id: 'fluids', label: 'Fluids' },
    { id: 'electrical', label: 'Electrical' },
    { id: 'general', label: 'General' },
];

const UNIT_CATEGORIES = [
    // ---- Mechanics ----------------------------------------------------------
    {
        id: 'length', label: 'Length', group: 'mechanics', siUnit: 'm', defaults: ['ft', 'm'],
        pairs: [['ft', 'm'], ['in', 'mm'], ['mi', 'km'], ['yd', 'm']],
        units: [
            ...si('m', 'Metre', ['n', 'µ', 'm', 'c', '', 'k']),
            O('Å', 'Angstrom', 1e-10),
            E('mil', 'Mil', 2.54e-5, '1 mil is a thousandth of an inch.'),
            E('in', 'Inch', IN, 'The inch is defined as exactly 25.4 mm.'),
            E('ft', 'Foot', FT, 'The foot is defined as exactly 0.3048 m.'),
            E('yd', 'Yard', 0.9144),
            E('mi', 'Mile', 1609.344, '1 mile is 5280 ft.'),
            O('nmi', 'Nautical mile', 1852),
        ],
    },
    {
        id: 'area', label: 'Area', group: 'mechanics', defaults: ['ft²', 'm²'],
        pairs: [['ft²', 'm²'], ['in²', 'mm²'], ['ac', 'ha'], ['ac', 'm²']],
        units: [
            S('mm²', 'Square millimetre', 1e-6),
            S('cm²', 'Square centimetre', 1e-4),
            S('m²', 'Square metre', 1),
            M('ha', 'Hectare', 1e4),
            S('km²', 'Square kilometre', 1e6),
            E('in²', 'Square inch', IN ** 2),
            E('ft²', 'Square foot', FT ** 2, 'Square the length factor: 0.3048² m².'),
            E('yd²', 'Square yard', 0.9144 ** 2),
            E('ac', 'Acre', 4046.8564224, '1 acre is 43,560 ft².'),
            E('mi²', 'Square mile', 1609.344 ** 2),
        ],
    },
    {
        id: 'volume', label: 'Volume', group: 'mechanics', defaults: ['gal', 'L'],
        pairs: [['gal', 'L'], ['ft³', 'm³'], ['in³', 'cm³'], ['ft³', 'gal']],
        units: [
            M('mL', 'Millilitre', 1e-6),
            S('cm³', 'Cubic centimetre', 1e-6),
            M('L', 'Litre', 1e-3),
            S('m³', 'Cubic metre', 1),
            E('in³', 'Cubic inch', IN ** 3),
            E('ft³', 'Cubic foot', FT ** 3, 'Cube the length factor: 0.3048³ m³.'),
            E('yd³', 'Cubic yard', 0.9144 ** 3),
            E('gal', 'Gallon (US)', GAL, 'The US gallon is 231 in³. The UK gallon is larger.'),
            E('gal(UK)', 'Gallon (UK)', 4.54609e-3),
            O('bbl', 'Barrel (oil)', 42 * GAL),
        ],
    },
    {
        id: 'mass', label: 'Mass', group: 'mechanics', defaults: ['lb', 'kg'],
        pairs: [['lb', 'kg'], ['slug', 'kg'], ['oz', 'g'], ['ton', 't']],
        units: [
            S('mg', 'Milligram', 1e-6),
            S('g', 'Gram', 1e-3),
            S('kg', 'Kilogram', 1),
            M('t', 'Tonne', 1000),
            M('hyl', 'Metric slug (hyl)', G, '1 kgf accelerates 1 hyl at 1 m/s².'),
            E('oz', 'Ounce', 0.028349523125),
            E('lb', 'Pound', LB, 'The pound is defined as exactly 0.45359237 kg.'),
            E('slug', 'Slug', LBF / FT, '1 lbf accelerates 1 slug at 1 ft/s², so 1 slug is 32.174 lb.'),
            E('ton', 'Ton (short, 2000 lb)', 2000 * LB),
            E('LT', 'Ton (long, 2240 lb)', 2240 * LB),
        ],
    },
    {
        id: 'force', label: 'Force', group: 'mechanics', siUnit: 'N', defaults: ['lbf', 'N'],
        pairs: [['lbf', 'N'], ['kgf', 'N'], ['kip', 'kN'], ['dyn', 'N']],
        units: [
            ...si('N', 'Newton', ['', 'k', 'M']),
            M('dyn', 'Dyne', 1e-5, '1 dyne accelerates 1 g at 1 cm/s².'),
            M('kgf', 'Kilogram-force', KGF, 'The weight of 1 kg under standard gravity, 9.80665 m/s².'),
            M('tf', 'Tonne-force', 1000 * KGF),
            E('pdl', 'Poundal', LB * FT, '1 poundal accelerates 1 lb at 1 ft/s².'),
            E('lbf', 'Pound-force', LBF, 'The weight of 1 lb under standard gravity: 0.45359237 kg × 9.80665 m/s².'),
            E('kip', 'Kip', 1000 * LBF, '1 kip is 1000 lbf.'),
        ],
    },
    {
        id: 'torque', label: 'Torque', group: 'mechanics', defaults: ['lb·ft', 'N·m'],
        pairs: [['lb·ft', 'N·m'], ['kgf·m', 'N·m'], ['lb·in', 'N·m'], ['lb·ft', 'kgf·m']],
        units: [
            S('N·m', 'Newton-metre', 1),
            S('kN·m', 'Kilonewton-metre', 1000),
            M('kgf·m', 'Kilogram-force metre', KGF),
            M('kgf·cm', 'Kilogram-force centimetre', KGF / 100),
            E('lb·ft', 'Pound-foot', FT_LBF, 'Force times arm: 4.44822 N × 0.3048 m.'),
            E('lb·in', 'Pound-inch', FT_LBF / 12),
        ],
    },
    {
        id: 'pressure', label: 'Pressure and stress', group: 'mechanics', alsoIn: ['thermo', 'fluids'], siUnit: 'Pa', defaults: ['psi', 'kPa'],
        pairs: [['psi', 'kPa'], ['kgf/cm²', 'kPa'], ['atm', 'kPa'], ['mmHg', 'kPa'], ['bar', 'psi'], ['ksi', 'MPa']],
        units: [
            ...si('Pa', 'Pascal', ['', 'k', 'M', 'G']),
            M('bar', 'Bar', 1e5, '1 bar is exactly 100 kPa.'),
            M('kgf/cm²', 'Kilogram-force per cm²', KGF / 1e-4, 'Also called the technical atmosphere.'),
            M('mmHg', 'Millimetre of mercury', 133.322387415),
            M('mH₂O', 'Metre of water', KGF * 1000),
            O('atm', 'Atmosphere', 101325, 'Standard atmosphere: 101.325 kPa, 14.696 psi, 760 mmHg.'),
            O('torr', 'Torr', 101325 / 760, '760 torr is 1 atm.'),
            E('psi', 'Pound per square inch', LBF / IN ** 2, 'Force over area: 4.44822 N ÷ (0.0254 m)².'),
            E('ksi', 'Kip per square inch', (1000 * LBF) / IN ** 2, '1 ksi is 1000 psi.'),
            E('lb/ft²', 'Pound per square foot', LBF / FT ** 2),
            E('inHg', 'Inch of mercury', 133.322387415 * 25.4),
            E('inH₂O', 'Inch of water', KGF * 1000 * IN),
            E('ftH₂O', 'Foot of water', KGF * 1000 * FT),
        ],
    },
    {
        id: 'energy', label: 'Work, energy and heat', group: 'mechanics', alsoIn: ['thermo', 'electrical'], siUnit: 'J', defaults: ['BTU', 'kJ'],
        pairs: [['BTU', 'kJ'], ['kcal', 'kJ'], ['ft·lbf', 'J'], ['kWh', 'BTU'], ['kWh', 'kJ'], ['BTU', 'kcal']],
        units: [
            ...si('J', 'Joule', ['', 'k', 'M', 'G']),
            S('Wh', 'Watt-hour', 3600),
            S('kWh', 'Kilowatt-hour', 3.6e6, '1 kW for 1 hour: 1000 W × 3600 s.'),
            S('MWh', 'Megawatt-hour', 3.6e9),
            M('erg', 'Erg', 1e-7),
            M('cal', 'Calorie', CAL, 'The international calorie, as in steam tables. The thermochemical one is 4.184 J.'),
            M('kcal', 'Kilocalorie', KCAL, 'Heat to raise 1 kg of water by 1 °C.'),
            M('cal(th)', 'Calorie (thermochemical)', 4.184),
            M('kgf·m', 'Kilogram-force metre', KGF),
            E('BTU', 'BTU', BTU, 'Heat to raise 1 lb of water by 1 °F. 1 BTU is about 778 ft·lbf or 252 cal.'),
            E('therm', 'Therm', 1e5 * BTU),
            E('ft·lbf', 'Foot-pound', FT_LBF, 'Force times distance: 4.44822 N × 0.3048 m.'),
            E('hp·h', 'Horsepower-hour', 550 * FT_LBF * 3600),
            O('eV', 'Electronvolt', 1.602176634e-19),
        ],
    },
    {
        id: 'power', label: 'Power and heat rate', group: 'mechanics', alsoIn: ['thermo', 'electrical'], siUnit: 'W', defaults: ['hp', 'kW'],
        pairs: [['hp', 'kW'], ['hp(I)', 'kW'], ['BTU/h', 'W'], ['TR', 'kW'], ['ft·lbf/s', 'W'], ['kcal/h', 'W']],
        units: [
            ...si('W', 'Watt', ['m', '', 'k', 'M', 'G']),
            M('PS', 'Horsepower (metric)', 75 * KGF, '75 kgf·m/s.'),
            M('kcal/h', 'Kilocalorie per hour', KCAL / 3600),
            M('kgf·m/s', 'Kilogram-force metre per second', KGF),
            E('hp', 'Horsepower (electric)', 746, 'Electrical problems use 746 W. Mechanical problems use 550 ft·lbf/s, which is 745.7 W: that one is hp(I).'),
            E('hp(I)', 'Horsepower (mechanical)', 550 * FT_LBF, '550 ft·lbf/s, which is 33,000 ft·lbf/min.'),
            E('ft·lbf/s', 'Foot-pound per second', FT_LBF),
            E('ft·lbf/min', 'Foot-pound per minute', FT_LBF / 60),
            E('BTU/h', 'BTU per hour', BTU / 3600),
            E('BTU/min', 'BTU per minute', BTU / 60),
            E('BTU/s', 'BTU per second', BTU),
            O('TR', 'Ton of refrigeration', (12000 * BTU) / 3600, 'Melting a short ton of ice in a day: 12,000 BTU/h, or about 211 kJ/min.'),
        ],
    },
    {
        id: 'speed', label: 'Speed', group: 'mechanics', defaults: ['mph', 'km/h'],
        pairs: [['mph', 'km/h'], ['ft/s', 'm/s'], ['km/h', 'm/s'], ['ft/min', 'm/s']],
        units: [
            S('m/s', 'Metre per second', 1),
            M('km/h', 'Kilometre per hour', 1 / 3.6, 'Divide by 3.6: 1000 m per 3600 s.'),
            E('ft/s', 'Foot per second', FT),
            E('ft/min', 'Foot per minute', FT / 60),
            E('mph', 'Mile per hour', 1609.344 / 3600),
            O('kn', 'Knot', 1852 / 3600),
        ],
    },
    {
        id: 'acceleration', label: 'Acceleration', group: 'mechanics', defaults: ['ft/s²', 'm/s²'],
        pairs: [['ft/s²', 'm/s²'], ['g₀', 'm/s²'], ['g₀', 'ft/s²']],
        units: [
            S('m/s²', 'Metre per second squared', 1),
            M('Gal', 'Gal', 0.01),
            E('ft/s²', 'Foot per second squared', FT),
            E('in/s²', 'Inch per second squared', IN),
            O('g₀', 'Standard gravity', G, 'Standard gravity is 9.80665 m/s², or 32.174 ft/s². Problems often round to 9.81 and 32.2.'),
        ],
    },
    {
        id: 'angvel', label: 'Rotational speed', group: 'mechanics', defaults: ['rpm', 'rad/s'],
        pairs: [['rpm', 'rad/s'], ['rev/s', 'rad/s'], ['deg/s', 'rad/s']],
        units: [
            S('rad/s', 'Radian per second', 1),
            O('rpm', 'Revolution per minute', (2 * Math.PI) / 60, 'One revolution is 2π radians, over 60 seconds.'),
            O('rev/s', 'Revolution per second', 2 * Math.PI),
            O('deg/s', 'Degree per second', Math.PI / 180),
        ],
    },
    {
        id: 'massdensity', label: 'Density', group: 'mechanics', alsoIn: ['thermo', 'fluids'], defaults: ['lb/ft³', 'kg/m³'],
        pairs: [['lb/ft³', 'kg/m³'], ['g/cm³', 'kg/m³'], ['slug/ft³', 'kg/m³'], ['lb/in³', 'g/cm³']],
        units: [
            S('kg/m³', 'Kilogram per cubic metre', 1),
            M('g/cm³', 'Gram per cubic centimetre', 1000, 'Water is about 1 g/cm³, 1000 kg/m³ or 62.4 lb/ft³.'),
            M('kg/L', 'Kilogram per litre', 1000),
            E('lb/ft³', 'Pound per cubic foot', LB / FT ** 3),
            E('lb/in³', 'Pound per cubic inch', LB / IN ** 3),
            E('lb/gal', 'Pound per gallon (US)', LB / GAL),
            E('slug/ft³', 'Slug per cubic foot', LBF / FT / FT ** 3),
        ],
    },
    {
        id: 'specweight', label: 'Specific weight', group: 'mechanics', alsoIn: ['fluids'], defaults: ['lbf/ft³', 'kN/m³'],
        pairs: [['lbf/ft³', 'kN/m³'], ['kgf/m³', 'N/m³']],
        units: [
            S('N/m³', 'Newton per cubic metre', 1),
            S('kN/m³', 'Kilonewton per cubic metre', 1000, 'Water is about 9.81 kN/m³ or 62.4 lbf/ft³.'),
            M('kgf/m³', 'Kilogram-force per cubic metre', KGF),
            E('lbf/ft³', 'Pound-force per cubic foot', LBF / FT ** 3),
            E('lbf/in³', 'Pound-force per cubic inch', LBF / IN ** 3),
        ],
    },
    {
        id: 'inertia', label: 'Second moment of area', group: 'mechanics', defaults: ['in⁴', 'mm⁴'],
        pairs: [['in⁴', 'mm⁴'], ['in⁴', 'cm⁴'], ['ft⁴', 'm⁴']],
        units: [
            S('mm⁴', 'Millimetre to the fourth', 1e-12),
            S('cm⁴', 'Centimetre to the fourth', 1e-8),
            S('m⁴', 'Metre to the fourth', 1),
            E('in⁴', 'Inch to the fourth', IN ** 4, 'Raise the length factor to the fourth: 25.4⁴ mm⁴.'),
            E('ft⁴', 'Foot to the fourth', FT ** 4),
        ],
    },

    // ---- Thermodynamics -----------------------------------------------------
    {
        // Base: kelvin.
        id: 'temperature', label: 'Temperature', group: 'thermo', defaults: ['°F', '°C'],
        pairs: [['°F', '°C'], ['°C', 'K'], ['°F', '°R'], ['K', '°R']],
        units: [
            { id: '°C', name: 'Celsius', system: 'SI', toBase: (v) => v + 273.15, fromBase: (k) => k - 273.15 },
            { id: 'K', name: 'Kelvin', system: 'SI', factor: 1 },
            { id: '°F', name: 'Fahrenheit', system: 'English', toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (k) => ((k - 273.15) * 9) / 5 + 32 },
            { id: '°R', name: 'Rankine', system: 'English', factor: R_PER_K },
        ],
    },
    {
        // A change in temperature has no offset: 10 °C warmer is 18 °F warmer, not 50.
        id: 'tempdiff', label: 'Temperature change', group: 'thermo', defaults: ['Δ°F', 'Δ°C'],
        pairs: [['Δ°F', 'Δ°C'], ['Δ°R', 'ΔK']],
        units: [
            S('ΔK', 'Kelvin (change)', 1),
            S('Δ°C', 'Celsius (change)', 1, 'A change has no offset: 1 °C of change is 1.8 °F of change, with no 32 added.'),
            E('Δ°F', 'Fahrenheit (change)', R_PER_K, 'A change has no offset: multiply by 5/9, with no 32 taken off.'),
            E('Δ°R', 'Rankine (change)', R_PER_K),
        ],
    },
    {
        id: 'specificheat', label: 'Specific heat and entropy', group: 'thermo', defaults: ['BTU/(lb·°F)', 'kJ/(kg·K)'],
        pairs: [['BTU/(lb·°F)', 'kJ/(kg·K)'], ['kcal/(kg·°C)', 'kJ/(kg·K)'], ['ft·lbf/(lb·°R)', 'kJ/(kg·K)']],
        units: [
            S('J/(kg·K)', 'Joule per kilogram kelvin', 1),
            S('kJ/(kg·K)', 'Kilojoule per kilogram kelvin', 1000, 'Water is about 4.187 kJ/(kg·K), which is 1 BTU/(lb·°F) and 1 kcal/(kg·°C).'),
            M('kcal/(kg·°C)', 'Kilocalorie per kilogram degree', KCAL),
            M('cal/(g·°C)', 'Calorie per gram degree', KCAL),
            E('BTU/(lb·°F)', 'BTU per pound degree', KCAL, 'BTU, pound and °F were defined so that this equals 4.1868 kJ/(kg·K) exactly.'),
            E('BTU/(lb·°R)', 'BTU per pound rankine', KCAL),
            E('ft·lbf/(lb·°R)', 'Foot-pound per pound rankine', FT_LBF / (LB * R_PER_K), 'Air\'s gas constant is 53.35 ft·lbf/(lb·°R), or 0.287 kJ/(kg·K).'),
        ],
    },
    {
        id: 'enthalpy', label: 'Enthalpy (per unit mass)', group: 'thermo', defaults: ['BTU/lb', 'kJ/kg'],
        pairs: [['BTU/lb', 'kJ/kg'], ['kcal/kg', 'kJ/kg'], ['ft·lbf/lb', 'kJ/kg']],
        units: [
            S('J/kg', 'Joule per kilogram', 1),
            S('kJ/kg', 'Kilojoule per kilogram', 1000),
            M('kcal/kg', 'Kilocalorie per kilogram', KCAL),
            M('cal/g', 'Calorie per gram', KCAL),
            E('BTU/lb', 'BTU per pound', 2326, '1 BTU/lb is exactly 2.326 kJ/kg, by definition of the international BTU.'),
            E('ft·lbf/lb', 'Foot-pound per pound', FT_LBF / LB),
        ],
    },
    {
        id: 'specvolume', label: 'Specific volume', group: 'thermo', alsoIn: ['fluids'], defaults: ['ft³/lb', 'm³/kg'],
        pairs: [['ft³/lb', 'm³/kg'], ['L/kg', 'm³/kg'], ['cm³/g', 'm³/kg']],
        units: [
            S('m³/kg', 'Cubic metre per kilogram', 1),
            M('L/kg', 'Litre per kilogram', 1e-3),
            M('cm³/g', 'Cubic centimetre per gram', 1e-3),
            E('ft³/lb', 'Cubic foot per pound', FT ** 3 / LB),
            E('in³/lb', 'Cubic inch per pound', IN ** 3 / LB),
        ],
    },
    {
        id: 'conductivity', label: 'Thermal conductivity', group: 'thermo', defaults: ['BTU/(h·ft·°F)', 'W/(m·K)'],
        pairs: [['BTU/(h·ft·°F)', 'W/(m·K)'], ['kcal/(h·m·°C)', 'W/(m·K)']],
        units: [
            S('W/(m·K)', 'Watt per metre kelvin', 1),
            M('kcal/(h·m·°C)', 'Kilocalorie per hour metre degree', KCAL / 3600),
            M('cal/(s·cm·°C)', 'Calorie per second centimetre degree', CAL / 0.01),
            E('BTU/(h·ft·°F)', 'BTU per hour foot degree', BTU / 3600 / (FT * R_PER_K)),
            E('BTU·in/(h·ft²·°F)', 'BTU inch per hour square foot degree', (BTU / 3600) * IN / (FT ** 2 * R_PER_K)),
        ],
    },
    {
        id: 'heattransfer', label: 'Heat transfer coefficient', group: 'thermo', defaults: ['BTU/(h·ft²·°F)', 'W/(m²·K)'],
        pairs: [['BTU/(h·ft²·°F)', 'W/(m²·K)'], ['kcal/(h·m²·°C)', 'W/(m²·K)']],
        units: [
            S('W/(m²·K)', 'Watt per square metre kelvin', 1),
            M('kcal/(h·m²·°C)', 'Kilocalorie per hour square metre degree', KCAL / 3600),
            E('BTU/(h·ft²·°F)', 'BTU per hour square foot degree', BTU / 3600 / (FT ** 2 * R_PER_K)),
        ],
    },
    {
        id: 'heatflux', label: 'Heat flux', group: 'thermo', defaults: ['BTU/(h·ft²)', 'W/m²'],
        pairs: [['BTU/(h·ft²)', 'W/m²'], ['kcal/(h·m²)', 'W/m²']],
        units: [
            S('W/m²', 'Watt per square metre', 1),
            S('kW/m²', 'Kilowatt per square metre', 1000),
            M('kcal/(h·m²)', 'Kilocalorie per hour square metre', KCAL / 3600),
            E('BTU/(h·ft²)', 'BTU per hour square foot', BTU / 3600 / FT ** 2),
        ],
    },

    // ---- Fluids -------------------------------------------------------------
    {
        id: 'flow', label: 'Volume flow rate', group: 'fluids', defaults: ['gpm', 'L/s'],
        pairs: [['gpm', 'L/s'], ['cfm', 'm³/h'], ['cfs', 'm³/s'], ['L/min', 'gpm']],
        units: [
            S('m³/s', 'Cubic metre per second', 1),
            M('m³/h', 'Cubic metre per hour', 1 / 3600),
            M('L/s', 'Litre per second', 1e-3),
            M('L/min', 'Litre per minute', 1e-3 / 60),
            E('cfs', 'Cubic foot per second', FT ** 3),
            E('cfm', 'Cubic foot per minute', FT ** 3 / 60),
            E('gpm', 'Gallon (US) per minute', GAL / 60),
        ],
    },
    {
        id: 'massflow', label: 'Mass flow rate', group: 'fluids', alsoIn: ['thermo'], defaults: ['lb/h', 'kg/s'],
        pairs: [['lb/h', 'kg/s'], ['lb/s', 'kg/s'], ['t/h', 'kg/s'], ['lb/min', 'kg/min']],
        units: [
            S('kg/s', 'Kilogram per second', 1),
            M('kg/min', 'Kilogram per minute', 1 / 60),
            M('kg/h', 'Kilogram per hour', 1 / 3600),
            M('t/h', 'Tonne per hour', 1000 / 3600),
            E('lb/s', 'Pound per second', LB),
            E('lb/min', 'Pound per minute', LB / 60),
            E('lb/h', 'Pound per hour', LB / 3600),
            E('slug/s', 'Slug per second', LBF / FT),
        ],
    },
    {
        id: 'dynvisc', label: 'Dynamic viscosity', group: 'fluids', defaults: ['lbf·s/ft²', 'Pa·s'],
        pairs: [['lbf·s/ft²', 'Pa·s'], ['cP', 'Pa·s'], ['lb/(ft·s)', 'Pa·s'], ['P', 'Pa·s']],
        units: [
            S('Pa·s', 'Pascal-second', 1),
            M('P', 'Poise', 0.1),
            M('cP', 'Centipoise', 1e-3, 'Water at 20 °C is about 1 cP.'),
            M('kgf·s/m²', 'Kilogram-force second per square metre', KGF),
            E('lbf·s/ft²', 'Pound-force second per square foot', LBF / FT ** 2),
            E('lb/(ft·s)', 'Pound per foot second', LB / FT),
        ],
    },
    {
        id: 'kinvisc', label: 'Kinematic viscosity', group: 'fluids', defaults: ['ft²/s', 'm²/s'],
        pairs: [['ft²/s', 'm²/s'], ['cSt', 'm²/s'], ['St', 'm²/s']],
        units: [
            S('m²/s', 'Square metre per second', 1),
            M('St', 'Stokes', 1e-4),
            M('cSt', 'Centistokes', 1e-6),
            E('ft²/s', 'Square foot per second', FT ** 2),
        ],
    },

    // ---- Electrical, across systems -----------------------------------------
    {
        id: 'charge', label: 'Charge', group: 'electrical', siUnit: 'C', defaults: ['Ah', 'C'],
        pairs: [['Ah', 'C'], ['mAh', 'C']],
        units: [...si('C', 'Coulomb', ['µ', 'm', '']), S('mAh', 'Milliampere-hour', 3.6), S('Ah', 'Ampere-hour', 3600, '1 A for 1 hour: 3600 C.')],
    },
    {
        id: 'frequency', label: 'Frequency', group: 'electrical', siUnit: 'Hz', defaults: ['Hz', 'rad/s'],
        pairs: [['Hz', 'rad/s'], ['rpm', 'Hz']],
        units: [...si('Hz', 'Hertz', ['', 'k', 'M', 'G']), O('rad/s', 'Radian per second', 1 / (2 * Math.PI), 'ω = 2πf.'), O('rpm', 'Revolution per minute', 1 / 60)],
    },
    {
        id: 'flux', label: 'Magnetic flux', group: 'electrical', siUnit: 'Wb', defaults: ['Wb', 'Mx'],
        pairs: [['Wb', 'Mx'], ['Wb', 'kl']],
        units: [...si('Wb', 'Weber', ['µ', 'm', '']), M('Mx', 'Maxwell (line)', 1e-8, 'The CGS unit: 10⁸ lines make 1 Wb.'), M('kl', 'Kiloline', 1e-5)],
    },
    {
        id: 'density', label: 'Flux density', group: 'electrical', siUnit: 'T', defaults: ['T', 'G'],
        pairs: [['T', 'G'], ['T', 'line/in²']],
        units: [...si('T', 'Tesla', ['µ', 'm', '']), M('G', 'Gauss', 1e-4, 'The CGS unit: 10⁴ G make 1 T.'), E('line/in²', 'Line per square inch', 1e-8 / IN ** 2)],
    },
    {
        id: 'field', label: 'Magnetic field', group: 'electrical', defaults: ['Oe', 'A/m'],
        pairs: [['Oe', 'A/m'], ['At/in', 'A/m']],
        units: [S('A/m', 'Ampere per metre', 1), M('Oe', 'Oersted', 1000 / (4 * Math.PI), 'The CGS unit: 1000/(4π) A/m.'), E('At/in', 'Ampere-turn per inch', 1 / IN)],
    },
    {
        id: 'conductor', label: 'Conductor area', group: 'electrical', defaults: ['MCM', 'mm²'],
        pairs: [['MCM', 'mm²'], ['cmil', 'mm²'], ['in²', 'cmil']],
        units: [
            S('mm²', 'Square millimetre', 1),
            E('cmil', 'Circular mil', CMIL_MM2, 'The area of a circle one mil across: π/4 mil². Square the diameter in mils to get cmil.'),
            E('MCM', 'Thousand circular mils', CMIL_MM2 * 1000),
            E('in²', 'Square inch', 645.16),
        ],
    },
    {
        id: 'resistivity', label: 'Resistivity', group: 'electrical', defaults: ['Ω·cmil/ft', 'Ω·m'],
        pairs: [['Ω·cmil/ft', 'Ω·m'], ['Ω·mm²/m', 'Ω·m']],
        units: [
            S('Ω·m', 'Ohm-metre', 1, 'Annealed copper at 20 °C is 1.724 × 10⁻⁸ Ω·m, or about 10.37 Ω·cmil/ft.'),
            M('Ω·cm', 'Ohm-centimetre', 0.01),
            M('Ω·mm²/m', 'Ohm-square millimetre per metre', 1e-6),
            E('Ω·cmil/ft', 'Ohm-circular mil per foot', (CMIL_MM2 * 1e-6) / FT),
        ],
    },
    {
        id: 'illuminance', label: 'Illuminance', group: 'electrical', defaults: ['fc', 'lx'],
        pairs: [['fc', 'lx']],
        units: [S('lx', 'Lux', 1), E('fc', 'Foot-candle', 1 / FT ** 2, '1 lumen per square foot.'), M('ph', 'Phot', 1e4)],
    },
    {
        // Base: a power ratio. A voltage ratio is its square root. One neper is a
        // voltage ratio of e, so 8.686 dB, the field-quantity definition.
        id: 'ratio', label: 'Ratios (dB)', group: 'electrical', defaults: ['dB', 'P ratio'],
        pairs: [['dB', 'P ratio'], ['dB', 'V ratio'], ['Np', 'dB']],
        units: [
            { id: 'dB', name: 'Decibel', system: 'Other', toBase: (v) => 10 ** (v / 10), fromBase: (b) => 10 * Math.log10(b) },
            { id: 'Np', name: 'Neper', system: 'Other', toBase: (v) => Math.exp(2 * v), fromBase: (b) => Math.log(b) / 2 },
            O('P ratio', 'Power ratio', 1),
            { id: 'V ratio', name: 'Voltage ratio', system: 'Other', toBase: (v) => v ** 2, fromBase: (b) => Math.sqrt(b) },
        ],
    },

    // ---- General ------------------------------------------------------------
    {
        id: 'time', label: 'Time', group: 'general', defaults: ['h', 's'],
        pairs: [['h', 's'], ['d', 'h'], ['min', 's']],
        units: [S('µs', 'Microsecond', 1e-6), S('ms', 'Millisecond', 1e-3), S('s', 'Second', 1), O('min', 'Minute', 60), O('h', 'Hour', 3600), O('d', 'Day', 86400), O('wk', 'Week', 604800)],
    },
    {
        id: 'angle', label: 'Angle', group: 'general', defaults: ['deg', 'rad'],
        pairs: [['deg', 'rad'], ['rev', 'deg'], ['grad', 'deg']],
        units: [S('rad', 'Radian', 1), O('deg', 'Degree', Math.PI / 180, 'π radians make 180°.'), O('grad', 'Gradian', Math.PI / 200), O('rev', 'Revolution', 2 * Math.PI), O('′', 'Arcminute', Math.PI / 10800), O('″', 'Arcsecond', Math.PI / 648000)],
    },
    {
        id: 'data', label: 'Data', group: 'general', defaults: ['MB', 'MiB'],
        pairs: [['MB', 'MiB'], ['GB', 'GiB'], ['B', 'bit']],
        units: [O('bit', 'Bit', 1 / 8), O('B', 'Byte', 1), O('kB', 'Kilobyte', 1e3), O('MB', 'Megabyte', 1e6), O('GB', 'Gigabyte', 1e9), O('KiB', 'Kibibyte', 1024), O('MiB', 'Mebibyte', 1024 ** 2), O('GiB', 'Gibibyte', 1024 ** 3)],
    },

    // ---- Prefix only --------------------------------------------------------
    // These have one unit and its prefixes, so they only move the decimal point.
    // They're not among the tiles: the Prefixes view does this job. They stay here
    // so search, a formula card's link and an old link still open them.
    { id: 'apparent', label: 'Apparent power', group: 'prefix', siUnit: 'VA', defaults: ['kVA', 'MVA'], units: si('VA', 'Volt-ampere', ['', 'k', 'M']) },
    { id: 'reactive', label: 'Reactive power', group: 'prefix', siUnit: 'VAR', defaults: ['kVAR', 'MVAR'], units: [{ ...S('VAR', 'Var', 1) }, { ...S('kVAR', 'Kilovar', 1e3), prefixed: true }, { ...S('MVAR', 'Megavar', 1e6), prefixed: true }] },
    { id: 'voltage', label: 'Voltage', group: 'prefix', siUnit: 'V', defaults: ['kV', 'V'], units: si('V', 'Volt', ['µ', 'm', '', 'k', 'M']) },
    { id: 'current', label: 'Current', group: 'prefix', siUnit: 'A', defaults: ['mA', 'A'], units: si('A', 'Ampere', ['µ', 'm', '', 'k']) },
    { id: 'resistance', label: 'Resistance', group: 'prefix', siUnit: 'Ω', defaults: ['kΩ', 'Ω'], units: si('Ω', 'Ohm', ['µ', 'm', '', 'k', 'M']) },
    { id: 'capacitance', label: 'Capacitance', group: 'prefix', siUnit: 'F', defaults: ['µF', 'nF'], units: si('F', 'Farad', ['p', 'n', 'µ', 'm', '']) },
    { id: 'inductance', label: 'Inductance', group: 'prefix', siUnit: 'H', defaults: ['mH', 'H'], units: si('H', 'Henry', ['n', 'µ', 'm', '']) },
];

// What the front of Units and tools offers first: across systems, heavy on ESAS.
const COMMON_CONVERSIONS = [
    ['pressure', 'psi', 'kPa'],
    ['pressure', 'kgf/cm²', 'kPa'],
    ['energy', 'BTU', 'kJ'],
    ['energy', 'kcal', 'kJ'],
    ['power', 'hp', 'kW'],
    ['temperature', '°F', '°C'],
    ['enthalpy', 'BTU/lb', 'kJ/kg'],
    ['specificheat', 'BTU/(lb·°F)', 'kJ/(kg·K)'],
    ['force', 'lbf', 'N'],
    ['mass', 'lb', 'kg'],
    ['length', 'ft', 'm'],
    ['flow', 'gpm', 'L/s'],
];

// All 24 SI prefixes, from BIPM's list (the last four added in 2022).
const SI_PREFIXES = [
    { name: 'quetta', symbol: 'Q', exp: 30 },
    { name: 'ronna', symbol: 'R', exp: 27 },
    { name: 'yotta', symbol: 'Y', exp: 24 },
    { name: 'zetta', symbol: 'Z', exp: 21 },
    { name: 'exa', symbol: 'E', exp: 18 },
    { name: 'peta', symbol: 'P', exp: 15 },
    { name: 'tera', symbol: 'T', exp: 12 },
    { name: 'giga', symbol: 'G', exp: 9 },
    { name: 'mega', symbol: 'M', exp: 6 },
    { name: 'kilo', symbol: 'k', exp: 3 },
    { name: 'hecto', symbol: 'h', exp: 2 },
    { name: 'deca', symbol: 'da', exp: 1 },
    { name: 'deci', symbol: 'd', exp: -1 },
    { name: 'centi', symbol: 'c', exp: -2 },
    { name: 'milli', symbol: 'm', exp: -3 },
    { name: 'micro', symbol: 'µ', exp: -6 },
    { name: 'nano', symbol: 'n', exp: -9 },
    { name: 'pico', symbol: 'p', exp: -12 },
    { name: 'femto', symbol: 'f', exp: -15 },
    { name: 'atto', symbol: 'a', exp: -18 },
    { name: 'zepto', symbol: 'z', exp: -21 },
    { name: 'yocto', symbol: 'y', exp: -24 },
    { name: 'ronto', symbol: 'r', exp: -27 },
    { name: 'quecto', symbol: 'q', exp: -30 },
];

const categoryById = (id) => UNIT_CATEGORIES.find((c) => c.id === id) || null;
const unitIn = (category, id) => category?.units.find((u) => u.id === id) || null;
const categoriesInGroup = (groupId) => UNIT_CATEGORIES.filter((c) => c.group === groupId || c.alsoIn?.includes(groupId));

const toBase = (u, value) => (u.toBase ? u.toBase(value) : value * u.factor);
const fromBase = (u, base) => (u.fromBase ? u.fromBase(base) : base / u.factor);

/** `value` in `from`, in `to`, within one category. Null when a unit isn't in it. */
function convert(categoryId, value, fromId, toId) {
    const category = categoryById(categoryId);
    const from = unitIn(category, fromId);
    const to = unitIn(category, toId);
    if (!from || !to) return null;
    if (from === to) return value;
    return fromBase(to, toBase(from, value));
}

/** `value` in `from`, in every unit of the category. */
function convertAll(categoryId, value, fromId) {
    const category = categoryById(categoryId);
    if (!unitIn(category, fromId)) return [];
    return category.units.map((u) => ({ unit: u, value: convert(categoryId, value, fromId, u.id) }));
}

/** The value in the category's SI unit, for reading it with another prefix. */
function inSiUnit(categoryId, value, fromId) {
    const category = categoryById(categoryId);
    if (!category?.siUnit) return null;
    return convert(categoryId, value, fromId, category.siUnit);
}

/** Categories and units matching a search, by name or symbol. */
function searchUnits(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    for (const category of UNIT_CATEGORIES) {
        for (const u of category.units) {
            if (u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) hits.push({ category, unit: u });
        }
    }
    return hits;
}

module.exports = {
    UNIT_SYSTEMS, UNIT_GROUPS, UNIT_CATEGORIES, COMMON_CONVERSIONS, SI_PREFIXES,
    categoryById, categoriesInGroup, unitIn, convert, convertAll, inSiUnit, searchUnits,
};
