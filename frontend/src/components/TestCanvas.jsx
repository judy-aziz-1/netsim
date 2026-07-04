import { Stage, Layer, Circle } from 'react-konva';

function TestCanvas() {
  return (
    <Stage width={800} height={600}>
      <Layer>
        <Circle x={400} y={300} radius={50} fill="steelblue" />
      </Layer>
    </Stage>
  );
}

export default TestCanvas;
