// src/features/conversion/ConversionTab.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ConversionTab from './ConversionTab';
import ToolsSheet from './ToolsSheet';

const Where = () => <p data-testid="where">{useLocation().search}</p>;
const at = (search = '') => render(
  <MemoryRouter initialEntries={[`/library?tab=conversion${search}`]}>
    <Where />
    <ConversionTab />
  </MemoryRouter>,
);
const output = () => document.querySelector('output');

beforeEach(() => localStorage.clear());

describe('Units', () => {
  it('tabs run Units, Tools, Shapes, Prefixes, Calculator', () => {
    at();
    const tabs = within(screen.getByRole('radiogroup', { name: 'Show' })).getAllByRole('radio');
    expect(tabs.map((t) => t.textContent)).toEqual(['Units', 'Tools', 'Shapes', 'Prefixes', 'Calculator']);
  });

  it('every quantity is a tile under its group, each once, with no common-conversions row', () => {
    at();
    expect(screen.queryByText('Common conversions')).toBeNull();
    for (const g of ['Mechanics', 'Thermodynamics', 'Fluids', 'Electrical', 'General']) expect(screen.getByRole('group', { name: g })).toBeInTheDocument();
    const thermo = within(screen.getByRole('group', { name: 'Thermodynamics' }));
    expect(thermo.getByRole('button', { name: /^Enthalpy/ })).toBeInTheDocument();
    expect(thermo.getByRole('button', { name: /^Specific heat/ })).toBeInTheDocument();
    // Pressure belongs to mechanics, and shows only there.
    expect(screen.getAllByRole('button', { name: /^Pressure/ })).toHaveLength(1);
    expect(within(screen.getByRole('group', { name: 'Mechanics' })).getByRole('button', { name: 'Pressure and stress: psi to kPa' })).toBeInTheDocument();
  });

  it('A–Z lists the same tiles alphabetically, and the choice is remembered', () => {
    const first = at();
    fireEvent.click(screen.getByRole('radio', { name: 'A–Z' }));
    expect(screen.queryByRole('group', { name: 'Mechanics' })).toBeNull();
    const names = screen.getAllByRole('button', { name: /: / }).map((b) => b.querySelector('span').textContent);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toHaveLength(39);
    first.unmount();
    at();
    expect(screen.getByRole('radio', { name: 'A–Z' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a prefix-only quantity isn’t among the tiles, and a link to one still works', () => {
    at();
    expect(screen.queryByRole('button', { name: /^Voltage/ })).toBeNull();
  });

  it('a formula card’s link to a prefix-only quantity opens it', () => {
    at('&cat=voltage');
    expect(screen.getByRole('heading', { name: 'Voltage' })).toBeInTheDocument();
    expect(screen.getByText(/Only the prefix changes/)).toBeInTheDocument();
  });

  it('a tile goes straight to its pair', () => {
    at();
    fireEvent.click(screen.getByRole('button', { name: 'Pressure and stress: psi to kPa' }));
    expect(screen.getByLabelText('From unit')).toHaveValue('psi');
    expect(output()).toHaveTextContent('6.894757');
  });

  it('a category offers its common pairs', () => {
    at('&cat=pressure');
    fireEvent.click(screen.getByRole('button', { name: 'atm → kPa' }));
    expect(screen.getByLabelText('From unit')).toHaveValue('atm');
    expect(screen.getByRole('button', { name: 'atm → kPa' })).toHaveAttribute('aria-pressed', 'true');
    expect(output()).toHaveTextContent('101.325');
  });

  it('every conversion shows how it works', () => {
    at('&cat=pressure&from=psi&to=kPa&v=2');
    const how = screen.getByRole('region', { name: 'How it works' });
    expect(within(how).getByText('English to SI')).toBeInTheDocument();
    expect(within(how).getByText('1 psi = 6.894757 kPa')).toBeInTheDocument();
    expect(within(how).getByText('kPa = psi × 6.894757')).toBeInTheDocument();
    expect(within(how).getByText('psi = kPa ÷ 6.894757')).toBeInTheDocument();
    expect(within(how).getByText('2 psi × 6.894757 = 13.78951 kPa')).toBeInTheDocument();
    expect(within(how).getByText('1 psi = 6894.757 Pa')).toBeInTheDocument();
    expect(within(how).getByText(/4\.44822 N ÷ \(0\.0254 m\)²/)).toBeInTheDocument();
  });

  it('a temperature shows its formula, with no multiplier to pretend', () => {
    at('&cat=temperature&from=%C2%B0F&to=%C2%B0C&v=212');
    const how = screen.getByRole('region', { name: 'How it works' });
    expect(within(how).getByText('°C = (°F − 32) × 5/9')).toBeInTheDocument();
    expect(within(how).getByText('(212 − 32) × 5/9 = 100 °C')).toBeInTheDocument();
    expect(within(how).getByText(/No single multiplier/)).toBeInTheDocument();
  });

  it('the other units leave out plain prefix changes, and sort by system', () => {
    at('&cat=pressure&from=psi&to=kPa&v=1');
    const list = screen.getByRole('region', { name: 'In other units' });
    expect(within(list).getByRole('button', { name: /Bar/ })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /Kilogram-force per cm²/ })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /Kilopascal/ })).toBeNull();
    expect(within(list).getByText('Metric (not SI)')).toBeInTheDocument();
  });

  it('the unit lists group by system, symbol first', () => {
    at('&cat=pressure');
    const select = screen.getByLabelText('To unit');
    expect(within(select).getByRole('group', { name: 'English' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'psi · Pound per square inch' })).toBeInTheDocument();
  });

  it('a tile opens a conversion in the URL, and All units goes back', () => {
    at();
    fireEvent.click(screen.getByRole('button', { name: /^Power and heat rate/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('cat=power');
    expect(screen.getByRole('heading', { name: 'Power and heat rate' })).toBeInTheDocument();
    expect(output()).toHaveTextContent('0.746');
    expect(screen.getByText('1 hp = 0.746 kW')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /All units/ }));
    expect(screen.getByTestId('where')).not.toHaveTextContent('cat=');
  });

  it('a link reopens the same conversion', () => {
    at('&cat=conductor&from=MCM&to=mm%C2%B2&v=250');
    expect(screen.getByLabelText('From')).toHaveValue('250');
    expect(output()).toHaveTextContent('126.67');
  });

  it('a bad link falls back rather than breaking', () => {
    at('&cat=nope');
    expect(screen.getByRole('button', { name: /^Power and heat rate/ })).toBeInTheDocument();
  });

  it('a bad unit in a link falls back to the category’s own', () => {
    at('&cat=power&from=kg&to=lb&v=1');
    expect(screen.getByLabelText('From unit')).toHaveValue('hp');
    expect(screen.getByLabelText('To unit')).toHaveValue('kW');
  });

  it('takes a sum, and shows what it came to', () => {
    at('&cat=frequency&from=Hz&to=rad%2Fs&v=60');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '30*2' } });
    expect(screen.getByText('= 60')).toBeInTheDocument();
    expect(output()).toHaveTextContent('376.99');
  });

  it('half a sum isn’t an error: it just waits', () => {
    at('&cat=power');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2+' } });
    expect(screen.queryByText(/finished/)).toBeNull();
    expect(screen.getByText('Keep going…')).toBeInTheDocument();
    expect(output()).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'Copy the result' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2+3' } });
    expect(output()).toHaveTextContent('3.73');
  });

  it('a sum that can’t work says why', () => {
    at('&cat=power');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '1/0' } });
    expect(screen.getByText('That has no finite answer.')).toBeInTheDocument();
    expect(output()).toHaveTextContent('—');
  });

  it('swaps', () => {
    at('&cat=power&from=hp&to=kW&v=1');
    fireEvent.click(screen.getByRole('button', { name: 'Swap the units' }));
    expect(screen.getByLabelText('From unit')).toHaveValue('kW');
    expect(screen.getByLabelText('To unit')).toHaveValue('hp');
    expect(output()).toHaveTextContent('1.3404');
  });

  it('picking the other side’s unit swaps instead of comparing a unit to itself', () => {
    at('&cat=power&from=hp&to=kW&v=1');
    fireEvent.change(screen.getByLabelText('From unit'), { target: { value: 'kW' } });
    expect(screen.getByLabelText('To unit')).toHaveValue('hp');
  });

  it('shows it in other units, and tapping one makes it the answer', () => {
    at('&cat=power&from=hp&to=kW&v=1');
    fireEvent.click(screen.getByRole('button', { name: /BTU per hour/ }));
    expect(screen.getByLabelText('To unit')).toHaveValue('BTU/h');
    expect(output()).toHaveTextContent('2545.4');
  });

  describe('the prefix slider', () => {
    const slider = () => screen.getByRole('slider', { name: 'Read it with a prefix' });

    it('starts on the prefix that reads best', () => {
      at('&cat=power&from=hp&to=kW&v=2000');
      expect(slider()).toHaveAttribute('aria-valuetext', '1.492 MW');
    });

    it('moving it reads the same quantity another way, and leaves the answer alone', () => {
      at('&cat=power&from=kW&to=hp&v=1.5');
      expect(slider()).toHaveAttribute('aria-valuetext', '1.5 kW');
      const before = output().textContent;
      fireEvent.change(slider(), { target: { value: '4' } });
      expect(slider()).toHaveAttribute('aria-valuetext', '1500 W');
      expect(screen.getByText('W with no prefix')).toBeInTheDocument();
      fireEvent.change(slider(), { target: { value: '6' } });
      expect(slider()).toHaveAttribute('aria-valuetext', '0.0015 MW');
      expect(screen.getByText('W ÷ 10⁶')).toBeInTheDocument();
      fireEvent.change(slider(), { target: { value: '3' } });
      expect(slider()).toHaveAttribute('aria-valuetext', '1500000 mW');
      expect(screen.getByText('W × 10³')).toBeInTheDocument();
      expect(output().textContent).toBe(before);
    });

    it('isn’t there for a category with no one SI unit, or for zero', () => {
      at('&cat=temperature&from=%C2%B0C&to=%C2%B0F&v=100');
      expect(screen.queryByRole('slider')).toBeNull();
    });

    it('isn’t there for zero', () => {
      at('&cat=power&from=hp&to=kW&v=0');
      expect(screen.queryByRole('slider')).toBeNull();
    });
  });

  it('search finds a unit by name and opens it', () => {
    at();
    fireEvent.change(screen.getByLabelText('Search units'), { target: { value: 'circular mil' } });
    fireEvent.click(screen.getByRole('button', { name: /^Circular mil \(cmil\)/ }));
    expect(screen.getByLabelText('From unit')).toHaveValue('cmil');
  });

  it('search says when there’s nothing', () => {
    at();
    fireEvent.change(screen.getByLabelText('Search units'), { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No unit by that name.');
  });

  it('a favourite stays on the device and opens from the front', () => {
    const view = at('&cat=power&from=hp&to=kW');
    fireEvent.click(screen.getByRole('button', { name: 'Add hp to kW to favourites' }));
    expect(screen.getByRole('button', { name: 'Remove hp to kW from favourites' })).toHaveAttribute('aria-pressed', 'true');
    view.unmount();
    at();
    fireEvent.click(within(screen.getByRole('region', { name: 'Favourites' })).getByRole('button', { name: 'Power and heat rate: hp to kW' }));
    expect(screen.getByRole('heading', { name: 'Power and heat rate' })).toBeInTheDocument();
  });

  it('recent conversions stay on the device, and clear', async () => {
    const view = at('&cat=power&from=hp&to=kW&v=2');
    await waitFor(() => expect(localStorage.getItem('ree:units')).toContain('"v":"2"'), { timeout: 3000 });
    view.unmount();
    at();
    expect(screen.getByRole('button', { name: '2 hp = 1.492 kW' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    expect(screen.queryByRole('button', { name: '2 hp = 1.492 kW' })).toBeNull();
  });

  describe('on this page', () => {
    const links = () => within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link').map((l) => l.textContent);

    it('lists each group', () => {
      at();
      expect(links()).toEqual(['Mechanics', 'Thermodynamics', 'Fluids', 'Electrical', 'General']);
    });

    it('goes to a group: scrolls it up, moves focus there, and leaves the URL alone', () => {
      const scrolled = vi.fn();
      Element.prototype.scrollIntoView = scrolled;
      at();
      fireEvent.click(screen.getByRole('link', { name: 'Fluids' }));
      const label = screen.getByText('Fluids', { selector: 'p' });
      expect(scrolled.mock.contexts[0]).toBe(label);
      expect(scrolled).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
      expect(label).toHaveFocus();
      expect(screen.getByTestId('where').textContent).toBe('?tab=conversion');
      delete Element.prototype.scrollIntoView;
    });

    it('scrolls without gliding when motion is reduced', () => {
      const scrolled = vi.fn();
      Element.prototype.scrollIntoView = scrolled;
      const media = window.matchMedia;
      window.matchMedia = (query) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} });
      at();
      fireEvent.click(screen.getByRole('link', { name: 'General' }));
      expect(scrolled).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
      window.matchMedia = media;
      delete Element.prototype.scrollIntoView;
    });

    it('A–Z has nowhere to go but the one list; search hides it too', () => {
      at();
      fireEvent.click(screen.getByRole('radio', { name: 'A–Z' }));
      expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
      fireEvent.click(screen.getByRole('radio', { name: 'Groups' }));
      fireEvent.change(screen.getByLabelText('Search units'), { target: { value: 'psi' } });
      expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
    });

    it('adds Favourites and Recent when there are some', async () => {
      const view = at('&cat=power&from=hp&to=kW&v=2');
      fireEvent.click(screen.getByRole('button', { name: 'Add hp to kW to favourites' }));
      await waitFor(() => expect(localStorage.getItem('ree:units')).toContain('"v":"2"'), { timeout: 3000 });
      view.unmount();
      at();
      expect(links()).toEqual(['Favourites', 'Mechanics', 'Thermodynamics', 'Fluids', 'Electrical', 'General', 'Recent']);
      expect(screen.getByRole('link', { name: 'Recent' })).toHaveAttribute('href', '#units-recent');
      fireEvent.click(screen.getByRole('radio', { name: 'A–Z' }));
      expect(links()).toEqual(['Favourites', 'Quantities', 'Recent']);
    });
  });
});

describe('Prefixes', () => {
  const open = async () => {
    at('&view=prefixes');
    await screen.findByLabelText('Value');
  };

  it('moves between any two prefixes and says how', async () => {
    await open();
    expect(output()).toHaveTextContent('1000 W');
    expect(screen.getByText(/10³ ÷ 10⁰ = 10³, so move the decimal point 3 places to the right/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '4.7' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'mega' } });
    expect(output()).toHaveTextContent('0.0047 MW');
    expect(screen.getByText(/3 places to the left/)).toBeInTheDocument();
  });

  it('is exact, with no float noise', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '1.1' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: 'micro' } });
    expect(output()).toHaveTextContent('0.0000011 W');
  });

  it('swaps', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Swap the prefixes' }));
    expect(screen.getByLabelText('From')).toHaveValue('no prefix');
    expect(screen.getByLabelText('To')).toHaveValue('kilo');
    expect(output()).toHaveTextContent('0.001 kW');
  });

  it('half a sum waits here too', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '2*' } });
    expect(screen.queryByText(/finished/)).toBeNull();
    expect(output()).toHaveTextContent('—');
  });

  it('lists every prefix with its factor', async () => {
    await open();
    const row = screen.getByRole('rowheader', { name: 'quetta' }).closest('tr');
    expect(within(row).getByText('10³⁰')).toBeInTheDocument();
    const milli = screen.getByRole('rowheader', { name: 'milli' }).closest('tr');
    expect(within(milli).getByText('10⁻³')).toBeInTheDocument();
    expect(within(milli).getByText('0.001')).toBeInTheDocument();
    expect(screen.getAllByRole('rowheader')).toHaveLength(24);
  });
});

describe('Board tools', () => {
  const tool = async (name) => {
    at('&view=tools');
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
  };

  it('tools sit under headers, with a list to go to each', async () => {
    at('&view=tools');
    const nav = await screen.findByRole('navigation', { name: 'On this page' });
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Every subject', 'AC and power systems', 'Wires and parts']);
    const ac = within(screen.getByRole('region', { name: 'AC and power systems' })).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(ac.map((label) => label.split(':')[0])).toEqual(['Power triangle', 'Phasor', 'Three-phase', 'Δ and Y', 'Per unit']);
    expect(within(screen.getByRole('region', { name: 'Every subject' })).getByRole('button', { name: /^Equivalents and constants/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Wires and parts' })).getAllByRole('button')).toHaveLength(2);
  });

  it('equivalents list what reviewers ask, each linked to its conversion', async () => {
    await tool('Equivalents and constants');
    expect(screen.getByText('14.6959 psi')).toBeInTheDocument();
    expect(screen.getByText('550 ft·lbf/s')).toBeInTheDocument();
    expect(screen.getByText('778.169 ft·lbf')).toBeInTheDocument();
    expect(screen.getByText('12000 BTU/h')).toBeInTheDocument();
    expect(screen.getByText('0.287 kJ/(kg·K) = 53.35 ft·lbf/(lb·°R)')).toBeInTheDocument();
    expect(screen.getByText('14.6959 psi').closest('a')).toHaveAttribute('href', expect.stringContaining('cat=pressure'));
  });

  it('each tool shows its formula', async () => {
    await tool('Power triangle');
    expect(screen.getByText('S = √(P² + Q²)')).toBeInTheDocument();
  });

  it('half a sum in a tool isn’t an error', async () => {
    await tool('Per unit');
    fireEvent.change(screen.getByLabelText('New base (MVA)'), { target: { value: '50*' } });
    expect(screen.queryByText(/finished/)).toBeNull();
  });

  it('power triangle works from its defaults and draws', async () => {
    await tool('Power triangle');
    expect(screen.getByText('125 kVA')).toBeInTheDocument();
    expect(screen.getByText('75 kVAR')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Power triangle/ })).toBeInTheDocument();
  });

  it('power triangle says when the values can’t work', async () => {
    await tool('Power triangle');
    fireEvent.change(screen.getByLabelText('Power factor'), { target: { value: '1.2' } });
    expect(screen.getByRole('status')).toHaveTextContent('can’t make a triangle');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('phasor goes both ways and draws', async () => {
    await tool('Phasor');
    expect(screen.getByText('10 ∠ 36.87°')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Rectangular' }));
    fireEvent.change(screen.getByLabelText('Real'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Imaginary (j)'), { target: { value: '4' } });
    expect(screen.getByText('5 ∠ 53.13°')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Phasor 5/ })).toBeInTheDocument();
  });

  it('Δ and Y: balanced 3 Ω is 1 Ω', async () => {
    await tool('Δ and Y');
    expect(screen.getAllByText('1 + j0')).toHaveLength(3);
    fireEvent.click(screen.getByRole('radio', { name: 'Y to Δ' }));
    expect(screen.getAllByText('3 + j0')).toHaveLength(3);
  });

  it('per unit changes base', async () => {
    await tool('Per unit');
    expect(screen.getByText('0.05 pu')).toBeInTheDocument();
    expect(screen.getByText('52.9 Ω')).toBeInTheDocument();
  });

  it('three-phase follows the connection', async () => {
    await tool('Three-phase');
    expect(screen.getByText('277.128 V')).toBeInTheDocument();
    expect(screen.getByText('83.1384 kVA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Delta (Δ)' }));
    expect(screen.getByText('57.735 A')).toBeInTheDocument();
  });

  it('wire gauge is a table', async () => {
    await tool('Wire gauge');
    const row = screen.getByRole('rowheader', { name: '4/0' }).closest('tr');
    expect(within(row).getByText('211600')).toBeInTheDocument();
  });

  it('resistor colours read aloud, and 5 bands adds a digit', async () => {
    await tool('Resistor colours');
    expect(screen.getByText('4.7 kΩ ±5%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Resistor reading 4.7 kΩ ±5%' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '5 bands' }));
    expect(screen.getByLabelText('Digit 3')).toBeInTheDocument();
    expect(screen.getByText('47 kΩ ±5%')).toBeInTheDocument();
  });

  it('a tool is in the URL, and All tools goes back', async () => {
    await tool('Phasor');
    expect(screen.getByTestId('where')).toHaveTextContent('tool=phasor');
    fireEvent.click(screen.getByRole('button', { name: /All tools/ }));
    expect(screen.getByTestId('where')).not.toHaveTextContent('tool=');
  });
});

// Each test renders the whole page, about 100 formulas: give a loaded parallel run room.
describe('Shapes', { timeout: 20000 }, () => {
  const open = async () => {
    at('&view=shapes');
    return screen.findByRole('navigation', { name: 'On this page' }, { timeout: 15000 });
  };
  const card = (name) => screen.getByRole('article', { name });
  const workOut = (name) => fireEvent.click(within(card(name)).getByRole('button', { name: `Work one out: ${name}` }));

  it('is a view of its own, in the URL', async () => {
    at();
    fireEvent.click(screen.getByRole('radio', { name: 'Shapes' }));
    expect(await screen.findByRole('heading', { name: 'Solids' }, { timeout: 15000 })).toBeInTheDocument(); // the first lazy load, with KaTeX
    expect(screen.getByTestId('where')).toHaveTextContent('view=shapes');
  });

  it('lists its five sections to go to', async () => {
    const nav = await open();
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Triangles', 'Quadrilaterals', 'Regular polygons', 'Circles', 'Solids']);
    expect(within(nav).getByRole('link', { name: 'Solids' })).toHaveAttribute('href', '#shapes-solids');
    // A long section has its own shapes in a select.
    expect(screen.getByLabelText('Go to a shape in solids')).toBeInTheDocument();
    expect(screen.queryByLabelText('Go to a shape in triangles')).toBeNull();
  });

  it('the select goes to a shape', async () => {
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled;
    await open();
    fireEvent.change(screen.getByLabelText('Go to a shape in solids'), { target: { value: 'shape-torus' } });
    expect(screen.getByRole('heading', { name: 'Torus' })).toHaveFocus();
    expect(scrolled).toHaveBeenCalled();
    delete Element.prototype.scrollIntoView;
  });

  it('every shape is drawn, named and given its formulas', async () => {
    await open();
    for (const article of screen.getAllByRole('article')) {
      const name = article.getAttribute('aria-labelledby');
      if (name === 'shape-polygon-names') continue; // a table, not a drawing
      expect(within(article).queryAllByRole('img').length, name).toBeGreaterThan(0);
      expect(article.querySelectorAll('.katex').length, name).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole('article')).toHaveLength(32);
    expect(document.querySelectorAll('.katex-error')).toHaveLength(0); // every formula parses
    expect(within(card('Any triangle')).getByText('Area, three sides (Heron)')).toBeInTheDocument();
    expect(within(card('Any triangle')).getByRole('img', { name: /Triangle ABC/ })).toBeInTheDocument();
    expect(within(card('Kinds of triangle')).getAllByRole('img')).toHaveLength(6);
  });

  it('a calculator opens on request, and shows the numbers put in', async () => {
    await open();
    expect(within(card('Square')).queryByLabelText('Side a')).toBeNull();
    workOut('Square');
    fireEvent.change(within(card('Square')).getByLabelText('Side a'), { target: { value: '3' } });
    expect(within(card('Square')).getByText('A = a² = 3² = 9')).toBeInTheDocument();
    expect(within(card('Square')).getByText('P = 4a = 4 × 3 = 12')).toBeInTheDocument();
  });

  it('takes a sum, and says what it can’t work out', async () => {
    await open();
    workOut('Circle');
    const field = within(card('Circle')).getByLabelText('Radius r');
    fireEvent.change(field, { target: { value: '2*2' } });
    expect(within(card('Circle')).getByText('d = 2r = 2 × 4 = 8')).toBeInTheDocument();
    fireEvent.change(field, { target: { value: '0' } });
    expect(within(card('Circle')).getByRole('status')).toHaveTextContent('above zero');
    workOut('Any triangle');
    fireEvent.change(within(card('Any triangle')).getByLabelText('Side c'), { target: { value: '9' } });
    expect(within(card('Any triangle')).getByRole('status')).toHaveTextContent('can’t close');
  });

  it('a calculator with more than one way in keeps each way’s numbers', async () => {
    await open();
    workOut('Any triangle');
    const tri = within(card('Any triangle'));
    expect(tri.getByText('Right')).toBeInTheDocument();
    fireEvent.change(tri.getByLabelText('Side a'), { target: { value: '6' } });
    fireEvent.click(tri.getByRole('radio', { name: 'Base, height' }));
    expect(tri.getByText('A = ½bh = ½ × 6 × 4 = 12')).toBeInTheDocument();
    fireEvent.click(tri.getByRole('radio', { name: 'Three sides' }));
    expect(tri.getByLabelText('Side a')).toHaveValue('6');
  });

  it('regular polygons: a names table, and a drawing and answers for any n', async () => {
    await open();
    const names = card('Names, 3 to 20 sides');
    expect(within(names).getAllByRole('rowheader').map((r) => r.textContent)).toContain('Pentadecagon');
    expect(within(names).getByRole('rowheader', { name: 'Hexagon' }).closest('tr')).toHaveTextContent('720°');
    const ngon = card('Any regular polygon');
    expect(within(ngon).getByRole('img', { name: /^Hexagon, 6 sides/ })).toBeInTheDocument();
    fireEvent.change(within(ngon).getByLabelText('Sides n'), { target: { value: '8' } });
    expect(within(ngon).getByRole('img', { name: /^Octagon, 8 sides/ })).toBeInTheDocument();
    workOut('Any regular polygon');
    expect(within(ngon).getByText('Σ = (n − 2) × 180° = (8 − 2) × 180° = 1080°')).toBeInTheDocument();
    fireEvent.change(within(ngon).getByLabelText('Sides n'), { target: { value: '6' } });
    expect(within(ngon).getByText(/^A = n s² ÷ \(4 tan\(180° ÷ n\)\) = .* = 2\.59808$/)).toBeInTheDocument();
  });

  it('Platonic solids: the table, Euler’s formula, and volume from the edge', async () => {
    await open();
    const solids = card('Platonic solids');
    const row = within(solids).getByRole('rowheader', { name: 'Dodecahedron' }).closest('tr');
    expect([...row.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['12', '20', '30', 'Pentagon']);
    expect(within(solids).getByText('Euler’s formula, for every one')).toBeInTheDocument();
    expect(within(solids).getByRole('img', { name: /^Cube \(hexahedron\): 6 square faces/ })).toBeInTheDocument();
    fireEvent.change(within(solids).getByLabelText('Solid'), { target: { value: 'icosahedron' } });
    expect(within(solids).getByRole('img', { name: /^Icosahedron: 20 triangle faces/ })).toBeInTheDocument();
    workOut('Platonic solids');
    expect(within(solids).getByText('V = 5(3 + √5) × a³ ÷ 12 = 5(3 + √5) × 1³ ÷ 12 = 2.18169')).toBeInTheDocument();
  });

  it('a box drawn from its corners dashes the three edges at the back', async () => {
    await open();
    const box = within(card('Prism')).getByRole('img');
    expect(box.querySelectorAll('line[stroke-dasharray="4 4"]')).toHaveLength(3);
  });
});

describe('Calculator', () => {
  const open = async () => {
    at('&view=calculator');
    await screen.findByLabelText('Sum');
  };
  const key = (name) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
  const keys = (...names) => names.forEach(key);
  const sum = () => screen.getByLabelText('Sum');
  const answer = () => screen.getByRole('status', { name: 'Answer' });

  it('answers as you type', async () => {
    await open();
    fireEvent.change(sum(), { target: { value: '2*pi*60' } });
    expect(answer()).toHaveTextContent('376.9911184');
  });

  // The owner's report, through the keypad: every step of building a sum.
  it('never says a sum is wrong while it’s still being built', async () => {
    await open();
    for (const name of ['2', 'Plus', 'Sine', '3', '0', 'Close bracket', 'Multiply', 'Open bracket', '4', 'Minus', '1', 'Close bracket']) {
      key(name);
      expect(screen.queryByText(/finished/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
    }
    expect(sum()).toHaveValue('2+sin(30)×(4−1)');
    expect(answer()).toHaveTextContent('3.5');
  });

  it('keeps showing the answer so far', async () => {
    await open();
    keys('2', 'Plus');
    expect(answer()).toHaveTextContent('2');
    keys('3', 'Multiply');
    expect(answer()).toHaveTextContent('5');
    key('4');
    expect(answer()).toHaveTextContent('14');
  });

  it('equals closes open brackets for you', async () => {
    await open();
    keys('Sine', '3', '0', 'Equals');
    expect(sum()).toHaveValue('0.5');
    expect(screen.queryByText(/finished/)).toBeNull();
  });

  it('equals on an unfinished sum says so, then lets you carry on', async () => {
    await open();
    keys('2', 'Plus', 'Equals');
    expect(screen.getByText('That sum isn’t finished yet.')).toBeInTheDocument();
    expect(sum()).toHaveValue('2+');
    key('3');
    expect(screen.queryByText(/finished/)).toBeNull();
    key('Equals');
    expect(sum()).toHaveValue('5');
  });

  it('equals on nothing does nothing', async () => {
    await open();
    key('Equals');
    expect(screen.queryByText(/finished/)).toBeNull();
  });

  it('a sum that can’t work says why, once you press equals', async () => {
    await open();
    fireEvent.change(sum(), { target: { value: '1/0' } });
    expect(screen.queryByText('That has no finite answer.')).toBeNull();
    fireEvent.keyDown(sum(), { key: 'Enter' });
    expect(screen.getByText('That has no finite answer.')).toBeInTheDocument();
  });

  it('after equals, a number starts over and an operator carries on', async () => {
    await open();
    keys('6', 'Multiply', '7', 'Equals');
    expect(sum()).toHaveValue('42');
    key('5');
    expect(sum()).toHaveValue('5');
    key('Equals');
    key('Plus');
    expect(sum()).toHaveValue('5+');
  });

  it('ans is the last answer', async () => {
    await open();
    keys('6', 'Multiply', '7', 'Equals', 'Last answer', 'Plus', '1');
    expect(sum()).toHaveValue('ans+1');
    expect(answer()).toHaveTextContent('43');
  });

  it('delete takes a whole function name, and clear takes the lot', async () => {
    await open();
    keys('Sine', '3');
    key('Delete');
    expect(sum()).toHaveValue('sin(');
    key('Delete');
    expect(sum()).toHaveValue('');
    keys('1', 'Close bracket', 'Last answer');
    key('Clear');
    expect(sum()).toHaveValue('');
  });

  it('2nd gives the inverse functions, for one key', async () => {
    await open();
    key('Inverse functions');
    expect(screen.getByRole('button', { name: 'Inverse functions' })).toHaveAttribute('aria-pressed', 'true');
    keys('Inverse cosine', '0', 'Point', '8', 'Equals');
    expect(Number(sum().value)).toBeCloseTo(36.8699, 3);
    expect(screen.getByRole('button', { name: 'Cosine' })).toBeInTheDocument();
  });

  it('has powers of ten and squares', async () => {
    await open();
    keys('5', 'Times ten to the power', '3', 'Equals');
    expect(sum()).toHaveValue('5000');
    keys('3', 'Squared', 'Equals');
    expect(sum()).toHaveValue('9');
  });

  it('a key goes in at the caret', async () => {
    await open();
    fireEvent.change(sum(), { target: { value: '19' } });
    sum().setSelectionRange(1, 1);
    key('5');
    expect(sum()).toHaveValue('159');
    expect(sum().selectionStart).toBe(2);
  });

  it('angles follow the setting', async () => {
    await open();
    fireEvent.change(sum(), { target: { value: 'cos(pi)' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Radians' }));
    expect(answer()).toHaveTextContent('-1');
  });

  it('keeps earlier sums, and one can be used again', async () => {
    await open();
    keys('6', 'Multiply', '7', 'Equals');
    const earlier = screen.getByRole('list', { name: 'Earlier sums' });
    fireEvent.click(within(earlier).getByRole('button', { name: /6×7 = 42/ }));
    expect(sum()).toHaveValue('6×7');
  });
});

describe('Practice’s sheet', () => {
  it('has the calculator, and units that don’t touch the URL', () => {
    render(
      <MemoryRouter initialEntries={['/practice']}>
        <Where />
        <ToolsSheet onClose={() => {}} />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Calculator and units' });
    expect(within(dialog).getByLabelText('Sum')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Units' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /^Power and heat rate/ }));
    expect(within(dialog).getByText('1 hp = 0.746 kW')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('');
  });
});
