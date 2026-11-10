// src/features/conversion/unitTiles.js
//
// How each quantity and tool looks as a tile: an icon, a short name that fits a
// third of a phone, and a tone by group, so the groups read apart at a glance. The
// full name stays the tile's accessible name. conversion.test.js fails on a gap.
import {
  Activity, ArrowDownToLine, AudioWaveform, BatteryCharging, BatteryFull, BookOpen, Box, Cable, CarFront, Clock,
  Compass, Droplet, Droplets, Fan, FastForward, Flame, FlaskConical, Gauge, Grid3x3, HardDrive, Layers, Lightbulb,
  Magnet, MoveRight, Network, Orbit, Package, Palette, Percent, RectangleVertical, RotateCw, Ruler, Shell, Square,
  Sun, Thermometer, ThermometerSun, Triangle, TriangleRight, Volume2, Waves, Weight, Wind, Zap,
} from '../../components/ui/icons';

export const GROUP_TONE = { mechanics: 'accent', thermo: 'danger', fluids: 'signal', electrical: 'amber', general: 'success' };

export const UNIT_TILES = {
  length: { icon: Ruler, short: 'Length' },
  area: { icon: Square, short: 'Area' },
  volume: { icon: Box, short: 'Volume' },
  mass: { icon: Weight, short: 'Mass' },
  force: { icon: MoveRight, short: 'Force' },
  torque: { icon: RotateCw, short: 'Torque' },
  pressure: { icon: Gauge, short: 'Pressure' },
  energy: { icon: BatteryCharging, short: 'Energy' },
  power: { icon: Zap, short: 'Power' },
  speed: { icon: CarFront, short: 'Speed' },
  acceleration: { icon: FastForward, short: 'Acceleration' },
  angvel: { icon: Fan, short: 'Rotation' },
  massdensity: { icon: Layers, short: 'Density' },
  specweight: { icon: ArrowDownToLine, short: 'Specific weight' },
  inertia: { icon: RectangleVertical, short: 'Area moment' },
  temperature: { icon: Thermometer, short: 'Temperature' },
  tempdiff: { icon: ThermometerSun, short: 'Temp. change' },
  specificheat: { icon: Flame, short: 'Specific heat' },
  enthalpy: { icon: FlaskConical, short: 'Enthalpy' },
  specvolume: { icon: Package, short: 'Specific volume' },
  conductivity: { icon: Cable, short: 'Conductivity' },
  heattransfer: { icon: Wind, short: 'Heat transfer' },
  heatflux: { icon: Sun, short: 'Heat flux' },
  flow: { icon: Droplets, short: 'Volume flow' },
  massflow: { icon: Waves, short: 'Mass flow' },
  dynvisc: { icon: Droplet, short: 'Viscosity' },
  kinvisc: { icon: Shell, short: 'Kin. viscosity' },
  charge: { icon: BatteryFull, short: 'Charge' },
  frequency: { icon: AudioWaveform, short: 'Frequency' },
  flux: { icon: Magnet, short: 'Magnetic flux' },
  density: { icon: Grid3x3, short: 'Flux density' },
  field: { icon: Orbit, short: 'Magnetic field' },
  conductor: { icon: Cable, short: 'Conductor size' },
  resistivity: { icon: Activity, short: 'Resistivity' },
  illuminance: { icon: Lightbulb, short: 'Illuminance' },
  ratio: { icon: Volume2, short: 'Decibels' },
  time: { icon: Clock, short: 'Time' },
  angle: { icon: TriangleRight, short: 'Angle' },
  data: { icon: HardDrive, short: 'Data' },
};

export const TOOL_ICONS = {
  equivalents: BookOpen,
  triangle: Triangle,
  phasor: Compass,
  deltawye: Network,
  perunit: Percent,
  threephase: AudioWaveform,
  awg: Cable,
  resistor: Palette,
};
