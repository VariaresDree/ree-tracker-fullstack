// Unit conversion: every category, unit and factor, with no network and no
// rates. Each unit is `factor` of its category's base, or a toBase/fromBase pair
// where the scale isn't linear (temperature, decibels). Lengths and masses use
// the exact international definitions; a comment marks each convention a board
// problem might read differently.
//
// Imported as @ree/shared/units and never re-exported from client.js, so it stays
// out of the boot download.

const unit = (id, name, factor) => ({ id, name, factor });

// One international BTU, in joules.
const BTU = 1055.05585262;
// One circular mil, in mm²: a circle one thousandth of an inch across.
const CMIL_MM2 = (Math.PI / 4) * 0.0254 ** 2;

const si = (symbol, name, prefixes) => {
    const SCALE = { p: 1e-12, n: 1e-9, µ: 1e-6, m: 1e-3, '': 1, k: 1e3, M: 1e6, G: 1e9, T: 1e12 };
    const WORD = { p: 'Pico', n: 'Nano', µ: 'Micro', m: 'Milli', '': '', k: 'Kilo', M: 'Mega', G: 'Giga', T: 'Tera' };
    return prefixes.map((p) => {
        const word = WORD[p] ? `${WORD[p]}${name.toLowerCase()}` : name;
        return unit(`${p}${symbol}`, word, SCALE[p]);
    });
};

const UNIT_GROUPS = [
    { id: 'electrical', label: 'Electrical' },
    { id: 'general', label: 'General' },
];

const UNIT_CATEGORIES = [
    {
        id: 'power', label: 'Power', group: 'electrical', siUnit: 'W', defaults: ['hp', 'kW'],
        units: [
            ...si('W', 'Watt', ['m', '', 'k', 'M', 'G']),
            // The electric horsepower: 746 W exactly, what board problems use.
            unit('hp', 'Horsepower (electric)', 746),
            unit('hp(I)', 'Horsepower (mechanical)', 745.6998715822702),
            unit('PS', 'Horsepower (metric)', 735.49875),
            unit('BTU/h', 'BTU per hour', BTU / 3600),
            unit('TR', 'Ton of refrigeration', (12000 * BTU) / 3600),
        ],
    },
    {
        id: 'apparent', label: 'Apparent power', group: 'electrical', siUnit: 'VA', defaults: ['kVA', 'MVA'],
        units: si('VA', 'Volt-ampere', ['', 'k', 'M']),
    },
    {
        id: 'reactive', label: 'Reactive power', group: 'electrical', siUnit: 'VAR', defaults: ['kVAR', 'MVAR'],
        units: [unit('VAR', 'Var', 1), unit('kVAR', 'Kilovar', 1e3), unit('MVAR', 'Megavar', 1e6)],
    },
    {
        id: 'voltage', label: 'Voltage', group: 'electrical', siUnit: 'V', defaults: ['kV', 'V'],
        units: si('V', 'Volt', ['µ', 'm', '', 'k', 'M']),
    },
    {
        id: 'current', label: 'Current', group: 'electrical', siUnit: 'A', defaults: ['mA', 'A'],
        units: si('A', 'Ampere', ['µ', 'm', '', 'k']),
    },
    {
        id: 'resistance', label: 'Resistance', group: 'electrical', siUnit: 'Ω', defaults: ['kΩ', 'Ω'],
        units: si('Ω', 'Ohm', ['µ', 'm', '', 'k', 'M']),
    },
    {
        id: 'capacitance', label: 'Capacitance', group: 'electrical', siUnit: 'F', defaults: ['µF', 'nF'],
        units: si('F', 'Farad', ['p', 'n', 'µ', 'm', '']),
    },
    {
        id: 'inductance', label: 'Inductance', group: 'electrical', siUnit: 'H', defaults: ['mH', 'H'],
        units: si('H', 'Henry', ['n', 'µ', 'm', '']),
    },
    {
        id: 'charge', label: 'Charge', group: 'electrical', siUnit: 'C', defaults: ['Ah', 'C'],
        units: [...si('C', 'Coulomb', ['µ', 'm', '']), unit('mAh', 'Milliampere-hour', 3.6), unit('Ah', 'Ampere-hour', 3600)],
    },
    {
        id: 'energy', label: 'Energy', group: 'electrical', siUnit: 'J', defaults: ['kWh', 'MJ'],
        units: [
            ...si('J', 'Joule', ['', 'k', 'M']),
            unit('Wh', 'Watt-hour', 3600),
            unit('kWh', 'Kilowatt-hour', 3.6e6),
            unit('MWh', 'Megawatt-hour', 3.6e9),
            unit('BTU', 'BTU', BTU),
            // The thermochemical calorie, 4.184 J exactly.
            unit('cal', 'Calorie', 4.184),
            unit('kcal', 'Kilocalorie', 4184),
            unit('ft·lbf', 'Foot-pound', 1.3558179483314004),
            unit('eV', 'Electronvolt', 1.602176634e-19),
        ],
    },
    {
        id: 'frequency', label: 'Frequency', group: 'electrical', siUnit: 'Hz', defaults: ['Hz', 'rad/s'],
        units: [...si('Hz', 'Hertz', ['', 'k', 'M', 'G']), unit('rad/s', 'Radian per second', 1 / (2 * Math.PI)), unit('rpm', 'Revolution per minute', 1 / 60)],
    },
    {
        id: 'flux', label: 'Magnetic flux', group: 'electrical', siUnit: 'Wb', defaults: ['Wb', 'Mx'],
        units: [...si('Wb', 'Weber', ['µ', 'm', '']), unit('Mx', 'Maxwell (line)', 1e-8), unit('kl', 'Kiloline', 1e-5)],
    },
    {
        id: 'density', label: 'Flux density', group: 'electrical', siUnit: 'T', defaults: ['T', 'G'],
        units: [...si('T', 'Tesla', ['µ', 'm', '']), unit('G', 'Gauss', 1e-4), unit('line/in²', 'Line per square inch', 1e-8 / 0.0254 ** 2)],
    },
    {
        id: 'field', label: 'Magnetic field', group: 'electrical', defaults: ['A/m', 'Oe'],
        units: [unit('A/m', 'Ampere per metre', 1), unit('Oe', 'Oersted', 1000 / (4 * Math.PI)), unit('At/in', 'Ampere-turn per inch', 1 / 0.0254)],
    },
    {
        id: 'conductor', label: 'Conductor area', group: 'electrical', defaults: ['MCM', 'mm²'],
        units: [unit('cmil', 'Circular mil', CMIL_MM2), unit('MCM', 'Thousand circular mils', CMIL_MM2 * 1000), unit('mm²', 'Square millimetre', 1), unit('in²', 'Square inch', 645.16)],
    },
    {
        id: 'resistivity', label: 'Resistivity', group: 'electrical', defaults: ['Ω·cmil/ft', 'Ω·m'],
        units: [
            unit('Ω·m', 'Ohm-metre', 1),
            unit('Ω·cm', 'Ohm-centimetre', 0.01),
            unit('Ω·mm²/m', 'Ohm-square millimetre per metre', 1e-6),
            unit('Ω·cmil/ft', 'Ohm-circular mil per foot', (CMIL_MM2 * 1e-6) / 0.3048),
        ],
    },
    {
        id: 'illuminance', label: 'Illuminance', group: 'electrical', defaults: ['fc', 'lx'],
        units: [unit('lx', 'Lux', 1), unit('fc', 'Foot-candle', 1 / 0.3048 ** 2), unit('ph', 'Phot', 1e4)],
    },
    {
        // Base: a power ratio. A voltage ratio is its square root. One neper is a
        // voltage ratio of e, so 8.686 dB, the field-quantity definition.
        id: 'ratio', label: 'Ratios (dB)', group: 'electrical', defaults: ['dB', 'P ratio'],
        units: [
            { id: 'dB', name: 'Decibel', toBase: (v) => 10 ** (v / 10), fromBase: (b) => 10 * Math.log10(b) },
            { id: 'Np', name: 'Neper', toBase: (v) => Math.exp(2 * v), fromBase: (b) => Math.log(b) / 2 },
            unit('P ratio', 'Power ratio', 1),
            { id: 'V ratio', name: 'Voltage ratio', toBase: (v) => v ** 2, fromBase: (b) => Math.sqrt(b) },
        ],
    },

    {
        id: 'length', label: 'Length', group: 'general', siUnit: 'm', defaults: ['ft', 'm'],
        units: [
            ...si('m', 'Metre', ['n', 'µ', 'm']),
            unit('cm', 'Centimetre', 0.01),
            unit('m', 'Metre', 1),
            unit('km', 'Kilometre', 1000),
            unit('mil', 'Mil', 2.54e-5),
            unit('in', 'Inch', 0.0254),
            unit('ft', 'Foot', 0.3048),
            unit('yd', 'Yard', 0.9144),
            unit('mi', 'Mile', 1609.344),
            unit('nmi', 'Nautical mile', 1852),
        ],
    },
    {
        id: 'area', label: 'Area', group: 'general', defaults: ['ft²', 'm²'],
        units: [
            unit('mm²', 'Square millimetre', 1e-6),
            unit('cm²', 'Square centimetre', 1e-4),
            unit('m²', 'Square metre', 1),
            unit('ha', 'Hectare', 1e4),
            unit('km²', 'Square kilometre', 1e6),
            unit('in²', 'Square inch', 0.0254 ** 2),
            unit('ft²', 'Square foot', 0.3048 ** 2),
            unit('yd²', 'Square yard', 0.9144 ** 2),
            unit('ac', 'Acre', 4046.8564224),
            unit('mi²', 'Square mile', 1609.344 ** 2),
        ],
    },
    {
        id: 'volume', label: 'Volume', group: 'general', defaults: ['gal', 'L'],
        units: [
            unit('mL', 'Millilitre', 1e-6),
            unit('L', 'Litre', 1e-3),
            unit('m³', 'Cubic metre', 1),
            unit('in³', 'Cubic inch', 0.0254 ** 3),
            unit('ft³', 'Cubic foot', 0.3048 ** 3),
            unit('gal', 'Gallon (US)', 3.785411784e-3),
            unit('gal(UK)', 'Gallon (UK)', 4.54609e-3),
        ],
    },
    {
        id: 'mass', label: 'Mass', group: 'general', defaults: ['lb', 'kg'],
        units: [
            unit('mg', 'Milligram', 1e-6),
            unit('g', 'Gram', 1e-3),
            unit('kg', 'Kilogram', 1),
            unit('t', 'Tonne', 1000),
            unit('oz', 'Ounce', 0.028349523125),
            unit('lb', 'Pound', 0.45359237),
            unit('ton', 'Ton (US)', 907.18474),
            unit('slug', 'Slug', 14.593902937206364),
        ],
    },
    {
        id: 'force', label: 'Force', group: 'general', siUnit: 'N', defaults: ['lbf', 'N'],
        units: [unit('dyn', 'Dyne', 1e-5), ...si('N', 'Newton', ['', 'k']), unit('lbf', 'Pound-force', 4.4482216152605), unit('kgf', 'Kilogram-force', 9.80665)],
    },
    {
        id: 'torque', label: 'Torque', group: 'general', defaults: ['lb·ft', 'N·m'],
        units: [unit('N·m', 'Newton-metre', 1), unit('kN·m', 'Kilonewton-metre', 1000), unit('lb·ft', 'Pound-foot', 1.3558179483314004), unit('lb·in', 'Pound-inch', 1.3558179483314004 / 12), unit('kgf·m', 'Kilogram-force metre', 9.80665)],
    },
    {
        id: 'pressure', label: 'Pressure', group: 'general', siUnit: 'Pa', defaults: ['psi', 'kPa'],
        units: [
            ...si('Pa', 'Pascal', ['', 'k', 'M']),
            unit('bar', 'Bar', 1e5),
            unit('atm', 'Atmosphere', 101325),
            unit('psi', 'Pound per square inch', 4.4482216152605 / 0.0254 ** 2),
            unit('mmHg', 'Millimetre of mercury', 133.322387415),
            unit('inHg', 'Inch of mercury', 3386.38815789),
        ],
    },
    {
        // Base: kelvin.
        id: 'temperature', label: 'Temperature', group: 'general', defaults: ['°C', '°F'],
        units: [
            { id: '°C', name: 'Celsius', toBase: (v) => v + 273.15, fromBase: (k) => k - 273.15 },
            { id: '°F', name: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (k) => ((k - 273.15) * 9) / 5 + 32 },
            unit('K', 'Kelvin', 1),
            unit('°R', 'Rankine', 5 / 9),
        ],
    },
    {
        id: 'speed', label: 'Speed', group: 'general', defaults: ['km/h', 'm/s'],
        units: [unit('m/s', 'Metre per second', 1), unit('km/h', 'Kilometre per hour', 1 / 3.6), unit('ft/s', 'Foot per second', 0.3048), unit('ft/min', 'Foot per minute', 0.3048 / 60), unit('mph', 'Mile per hour', 1609.344 / 3600), unit('kn', 'Knot', 1852 / 3600)],
    },
    {
        id: 'time', label: 'Time', group: 'general', defaults: ['h', 's'],
        units: [unit('µs', 'Microsecond', 1e-6), unit('ms', 'Millisecond', 1e-3), unit('s', 'Second', 1), unit('min', 'Minute', 60), unit('h', 'Hour', 3600), unit('d', 'Day', 86400), unit('wk', 'Week', 604800)],
    },
    {
        id: 'angle', label: 'Angle', group: 'general', defaults: ['deg', 'rad'],
        units: [unit('deg', 'Degree', Math.PI / 180), unit('rad', 'Radian', 1), unit('grad', 'Gradian', Math.PI / 200), unit('rev', 'Revolution', 2 * Math.PI), unit('′', 'Arcminute', Math.PI / 10800), unit('″', 'Arcsecond', Math.PI / 648000)],
    },
    {
        id: 'data', label: 'Data', group: 'general', defaults: ['MB', 'MiB'],
        units: [unit('bit', 'Bit', 1 / 8), unit('B', 'Byte', 1), unit('kB', 'Kilobyte', 1e3), unit('MB', 'Megabyte', 1e6), unit('GB', 'Gigabyte', 1e9), unit('KiB', 'Kibibyte', 1024), unit('MiB', 'Mebibyte', 1024 ** 2), unit('GiB', 'Gibibyte', 1024 ** 3)],
    },
];

const categoryById = (id) => UNIT_CATEGORIES.find((c) => c.id === id) || null;
const unitIn = (category, id) => category?.units.find((u) => u.id === id) || null;

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

/** The value in the category's SI unit, for showing where it sits on the prefix scale. */
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

module.exports = { UNIT_GROUPS, UNIT_CATEGORIES, categoryById, unitIn, convert, convertAll, inSiUnit, searchUnits };
