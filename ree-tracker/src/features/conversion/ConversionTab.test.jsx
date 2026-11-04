// src/features/conversion/ConversionTab.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
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
  it('opens on the category tiles, electrical first', () => {
    at();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Electrical', 'General']);
    expect(screen.getByRole('button', { name: /Apparent power/ })).toBeInTheDocument();
  });

  it('a tile opens a conversion in the URL, and All units goes back', () => {
    at();
    fireEvent.click(screen.getByRole('button', { name: /^Power/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('cat=power');
    expect(screen.getByRole('heading', { name: 'Power' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /^Power/ })).toBeInTheDocument();
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

  it('a bad sum says why and shows no answer', () => {
    at('&cat=power');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2+' } });
    expect(screen.getByText('That isn’t finished.')).toBeInTheDocument();
    expect(output()).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'Copy the result' })).toBeDisabled();
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

  it('shows it in every unit, and tapping one makes it the answer', () => {
    at('&cat=power&from=hp&to=kW&v=1');
    fireEvent.click(screen.getByRole('button', { name: /BTU per hour/ }));
    expect(screen.getByLabelText('To unit')).toHaveValue('BTU/h');
    expect(output()).toHaveTextContent('2545.4');
  });

  it('shows where it sits on the SI scale, only where there is one', () => {
    at('&cat=power&from=kW&to=W&v=1.5');
    expect(screen.getByRole('img', { name: /that’s 1\.5 kW/ })).toBeInTheDocument();
  });

  it('no SI scale for a category without one, or a temperature’s line', () => {
    at('&cat=temperature&from=%C2%B0C&to=%C2%B0F&v=100');
    expect(output()).toHaveTextContent('212');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/^1 °C =/)).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: 'hp → kW' }));
    expect(screen.getByRole('heading', { name: 'Power' })).toBeInTheDocument();
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
});

describe('Board tools', () => {
  const tool = async (name) => {
    at('&view=tools');
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
  };

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

describe('Calculator', () => {
  const open = async () => {
    at('&view=calculator');
    await screen.findByLabelText('Sum');
  };
  const key = (name) => fireEvent.click(screen.getByRole('button', { name }));

  it('answers as you type', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Sum'), { target: { value: '2*pi*60' } });
    expect(output()).toHaveTextContent('376.9911184');
  });

  it('the keypad builds a sum', async () => {
    await open();
    key('Sine');
    key('3');
    key('0');
    key('Close bracket');
    expect(screen.getByLabelText('Sum')).toHaveValue('sin(30)');
    expect(output()).toHaveTextContent('0.5');
    key('Delete');
    expect(screen.getByLabelText('Sum')).toHaveValue('sin(30');
    key('Clear');
    expect(screen.getByLabelText('Sum')).toHaveValue('');
  });

  it('angles follow the setting', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Sum'), { target: { value: 'cos(pi)' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Radians' }));
    expect(output()).toHaveTextContent('-1');
  });

  it('equals keeps the answer for ans, and the sum in the list', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Sum'), { target: { value: '6*7' } });
    fireEvent.keyDown(screen.getByLabelText('Sum'), { key: 'Enter' });
    expect(screen.getByLabelText('Sum')).toHaveValue('42');
    expect(within(screen.getByRole('list', { name: 'Earlier sums' })).getByText(/6\*7/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sum'), { target: { value: 'ans+1' } });
    expect(output()).toHaveTextContent('43');
  });

  it('a bad sum says why', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Sum'), { target: { value: '1/0' } });
    expect(screen.getByText('That has no finite answer.')).toBeInTheDocument();
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
    fireEvent.click(within(dialog).getByRole('button', { name: /^Power/ }));
    expect(within(dialog).getByText('1 hp = 0.746 kW')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('');
  });
});
