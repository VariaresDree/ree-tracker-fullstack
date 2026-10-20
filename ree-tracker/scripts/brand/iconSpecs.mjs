// scripts/brand/iconSpecs.mjs
//
// Every app icon, as a list: where it goes, its size, and the logoSvg()
// options it is drawn with. build-icons.mjs renders them; appIcons.test.js
// checks the committed files still match (sizes, and the favicon's source).
//
// Space around the mark, measured on the tight square around it (626 units):
// the corner of the triangle is 436 units from its centre, so a mark that
// must sit inside a circle (maskable icons, Android's adaptive and round
// icons) needs padding = (1 - 626 / (2 × 436 / share)) / 2, where share is
// the circle's diameter as a share of the side.
import { LOGO_TIGHT_VIEWBOX } from '../../src/components/ui/logoGeometry.js';

const BLACK = '#000000';
const WHITE = '#ffffff';
const tight = { viewBox: LOGO_TIGHT_VIEWBOX };

// The favicon: the small detail on a black rounded tile, so the white
// letterforms hold on a light browser tab too.
export const FAVICON = { ...tight, detail: 'small', background: BLACK, radius: 0.22, padding: 0.06 };

const PUBLIC = 'public';
const RES = 'android/app/src/main/res';
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const perDensity = (dir, file, dp, svg) => Object.entries(DENSITIES).map(([d, k]) => ({
  file: `${RES}/${dir}-${d}/${file}`, width: dp * k, height: dp * k, svg,
}));

/** @type {{ file: string, width: number, height: number, svg?: object, splash?: boolean }[]} */
export const ICONS = [
  // Web: the PWA's "any" icons keep a rounded tile on a clear ground; the
  // maskable ones fill the square and keep the mark inside the central 80%
  // circle every mask leaves.
  { file: `${PUBLIC}/apple-touch-icon.png`, width: 180, height: 180, svg: { ...tight, background: BLACK, padding: 0.12 } },
  { file: `${PUBLIC}/pwa-192x192.png`, width: 192, height: 192, svg: { ...tight, background: BLACK, radius: 0.22, padding: 0.1 } },
  { file: `${PUBLIC}/pwa-512x512.png`, width: 512, height: 512, svg: { ...tight, background: BLACK, radius: 0.22, padding: 0.1 } },
  { file: `${PUBLIC}/pwa-maskable-192x192.png`, width: 192, height: 192, svg: { ...tight, background: BLACK, padding: 0.22 } },
  { file: `${PUBLIC}/pwa-maskable-512x512.png`, width: 512, height: 512, svg: { ...tight, background: BLACK, padding: 0.22 } },
  // The badge Android shows in the status bar for a web notification: only
  // its shape is used, so one colour.
  { file: `${PUBLIC}/badge-96.png`, width: 96, height: 96, svg: { ...tight, mono: WHITE, padding: 0.06 } },

  // Android launcher: the legacy square and round icons, and the adaptive
  // icon's layers (108dp, of which a 66dp circle is always shown) on a black
  // background (values/ic_launcher_background.xml), plus a one-colour layer
  // for Android 13's themed icons.
  ...perDensity('mipmap', 'ic_launcher.png', 48, { ...tight, background: BLACK, radius: 0.18, padding: 0.12 }),
  ...perDensity('mipmap', 'ic_launcher_round.png', 48, { ...tight, background: BLACK, circle: true, padding: 0.18 }),
  ...perDensity('mipmap', 'ic_launcher_foreground.png', 108, { ...tight, padding: 0.28 }),
  ...perDensity('mipmap', 'ic_launcher_monochrome.png', 108, { ...tight, mono: WHITE, padding: 0.28 }),
  // The small icon of the daily reminder (LocalNotifications, capacitor.config.json).
  ...perDensity('drawable', 'ic_stat_ree.png', 24, { ...tight, mono: WHITE, padding: 0.04 }),

  // Android splash: the mark on black, at the sizes Capacitor's launch theme
  // ships (landscape; portrait is the same turned).
  ...[
    ['drawable', 480, 320],
    ...Object.entries({ mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] })
      .flatMap(([d, [w, h]]) => [[`drawable-land-${d}`, w, h], [`drawable-port-${d}`, h, w]]),
  ].map(([dir, width, height]) => ({ file: `${RES}/${dir}/splash.png`, width, height, splash: true })),
];

/** The mark's side on a splash screen, as a share of the screen's short side. */
export const SPLASH_MARK = 0.42;
