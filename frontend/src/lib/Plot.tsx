/**
 * CJS/ESM interop shim for react-plotly.js.
 *
 * react-plotly.js is a CommonJS package. With Vite (rolldown), pre-bundling
 * can wrap it so the component lands on `.default` instead of the namespace
 * root, causing React to receive a plain object instead of a function.
 * This shim normalises the import regardless of how Vite resolves it.
 */
import PlotlyReact from 'react-plotly.js';
import type { PlotParams } from 'react-plotly.js';

type PlotType = React.ComponentType<PlotParams>;

// If Vite wrapped the module the component is on .default; otherwise it is
// the import value itself.
const Plot = (
  (PlotlyReact as unknown as { default?: PlotType }).default ?? PlotlyReact
) as PlotType;

export default Plot;
