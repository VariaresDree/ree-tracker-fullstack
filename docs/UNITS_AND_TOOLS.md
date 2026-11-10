# Units and tools: how it's built, and what could come next

Library › Units and tools (`?tab=conversion`, `ree-tracker/src/features/conversion/`) is meant to keep growing. This note says how to add to it, and lists what's worth adding. It all runs on the device, with no network.

## What guides it

The owner's direction (2026-11-04):

- **Conversions across systems come first.** SI to metric to English is the hard part. Changing a prefix only moves the decimal point, so it has one screen (Prefixes) rather than a tile for every electrical unit.
- **ESAS matters as much as EE.** Thermodynamics, fluid mechanics, engineering mechanics and deformable bodies use a lot of these.
- **Every conversion shows how it works:** the multiplier, the formula both ways, the number worked through, and why the factor is what it is.

## How to add to it

| To add | Do this | Where |
|---|---|---|
| A unit | Add a row with `S`, `M`, `E` or `O` for its system. A `note` says where the factor comes from | `packages/shared/src/units.js` |
| A quantity | Add a category with a `group`, `defaults` that cross systems, and `pairs` | Same file |
| A nonlinear pair | Give the units `toBase`/`fromBase`, and each pair a formula in `BY_FORMULA` | `units.js`, `explain.js` |
| A quantity's tile (icon, short name) | Add to `UNIT_TILES`; a test fails on a gap | `unitTiles.js` |
| A board equivalent | Add a row: it's worked out from the table | `equivalents.js` |
| A constant | Add it to `CONSTANTS`, as reviewers quote it | `equivalents.js` |
| A tool | Put the arithmetic in `boardMath.js` with worked examples, then add a component, a `TOOLS` row and its icon in `TOOL_ICONS`. Show its formula with `Formula` | `BoardTools.jsx` |
| A formula card's link | Add its symbol to `BY_SYMBOL` | `unitLink.js` |

**Every number needs a test against a published value,** not the code's own factor (`conversion.test.js`). Tests already check that each unit has a system, each category's first conversion crosses systems, every pair round-trips, and every pair can explain itself.

**Everything stays lazy.** The boot download is at 99.3% of its budget. Icons come through the `components/ui/icons` barrel. `@ree/shared/units` is never re-exported from `client.js`.

## What could come next

Roughly in order of how much it would help on the board. None of this is built.

### Thermodynamics

- **Ideal gas:** PV = mRT in either unit system, solving for whichever is blank, with the gas constant to match.
- **Gas processes:** isothermal, isobaric, isochoric, isentropic, polytropic: end states, work and heat.
- **Steam tables:** saturation and superheated lookups with interpolation. A real data set, and it needs a source we can cite.
- **Cycles:** Carnot, Otto, Diesel and Rankine efficiency.
- **Heat transfer:** conduction through a wall, and thermal resistance in series.
- **Psychrometrics:** humidity and enthalpy of moist air.
- **More quantities:** molar mass and molar energy, thermal resistance (R-value), thermal expansion, heat of combustion.

### Mechanics and fluids

- **Bernoulli and continuity,** head loss, Reynolds number, and pump power.
- **Hydrostatics:** pressure at depth, and gauge against absolute pressure.
- **Stress and strain,** Young's modulus, and thermal stress.
- **Section properties:** centroid and second moment of area for common shapes.
- **Beams:** reactions, shear and moment for standard loads.
- **Kinematics:** the constant-acceleration equations, solving for the blank.
- **More quantities:** impulse and momentum, stiffness, moment of inertia of a mass.

### Electrical

- **Voltage drop** and conductor sizing, from the wire gauge table and resistivity.
- **Resistance with temperature,** and resistance from resistivity, length and area.
- **Power factor correction:** the capacitor kVAR to reach a target.
- **Machines:** synchronous speed, slip, transformer turns ratio and regulation.
- **Short circuit** on a per-unit system.
- **Series and parallel:** R, L and C, and resonance.
- **Larger conductor sizes** beside AWG: 250 to 1000 MCM, and mm² metric sizes.

### Calculator

- **Complex mode,** like a CASIO fx-991 in CMPLX. The Phasor tool covers one value today.
- **Equation solvers:** simultaneous equations, quadratics and polynomials.
- **Statistics, and nCr and nPr,** for the Mathematics part.
- **Base-N:** binary, octal and hex, for Microprocessor Systems and Logic Circuits.
- **Matrix** determinants and inverses.
- **Memory keys,** and degree-minute-second entry.

### Engineering economics

- **Compound interest factors:** F/P, P/F, A/P, P/A, gradient and effective rate.
- **Depreciation:** straight line, sum of years' digits, declining balance, sinking fund.
- **Break-even analysis.**

### The screens

- **A worked problem** under each tool: a board-style question with its steps.
- **Drill mode:** "convert this", from the same table, as a quick self-test. It would need deciding whether it counts toward progress.
- **Compound units from parts:** combine a length, a mass and a time by hand, for a unit that has no row.
- **Linked from the question:** a Practice question naming a unit opens that conversion in the tools sheet.
- **A rounding setting:** significant figures, or the board's 2 or 4 decimal places.
- **Printing** the equivalents and the prefix table with a formula sheet.
