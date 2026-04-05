import type {
  GeoreferenceAffineTransform,
  GeoreferenceControlPoint,
  GeoreferenceCornerQuad,
  ReferenceDocument
} from "./types";

const MIN_AFFINE_CONTROL_POINTS = 3;

const solveAffineCoefficients = (
  points: GeoreferenceControlPoint[],
  getTarget: (point: GeoreferenceControlPoint) => number
): [number, number, number] | null => {
  if (points.length < MIN_AFFINE_CONTROL_POINTS) {
    return null;
  }

  const [a, b, c] = points;
  const matrix = [
    [a.imageX, a.imageY, 1],
    [b.imageX, b.imageY, 1],
    [c.imageX, c.imageY, 1]
  ] as const;
  const target = [getTarget(a), getTarget(b), getTarget(c)] as const;

  const determinant =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

  if (Math.abs(determinant) < 1e-9) {
    return null;
  }

  const determinantFor = (column: 0 | 1 | 2) => {
    const replaced = matrix.map((row, rowIndex) => {
      const next = [...row];
      next[column] = target[rowIndex];
      return next;
    });

    return (
      replaced[0][0] * (replaced[1][1] * replaced[2][2] - replaced[1][2] * replaced[2][1]) -
      replaced[0][1] * (replaced[1][0] * replaced[2][2] - replaced[1][2] * replaced[2][0]) +
      replaced[0][2] * (replaced[1][0] * replaced[2][1] - replaced[1][1] * replaced[2][0])
    );
  };

  return [
    determinantFor(0) / determinant,
    determinantFor(1) / determinant,
    determinantFor(2) / determinant
  ];
};

const resolveAffineCornerQuad = (
  transform: GeoreferenceAffineTransform
): GeoreferenceCornerQuad | null => {
  const longitude = solveAffineCoefficients(
    transform.controlPoints,
    (point) => point.longitude
  );
  const latitude = solveAffineCoefficients(
    transform.controlPoints,
    (point) => point.latitude
  );

  if (!longitude || !latitude) {
    return null;
  }

  const project = (imageX: number, imageY: number): [number, number] => [
    longitude[0] * imageX + longitude[1] * imageY + longitude[2],
    latitude[0] * imageX + latitude[1] * imageY + latitude[2]
  ];

  const { width, height } = transform.imageDimensions;

  return {
    topLeft: project(0, 0),
    topRight: project(width, 0),
    bottomRight: project(width, height),
    bottomLeft: project(0, height)
  };
};

export const hasRenderableGeoreference = (document: ReferenceDocument): boolean =>
  document.type === "image" &&
  Boolean(document.georeference?.aligned && resolveGeoreferenceQuad(document));

export const resolveGeoreferenceQuad = (
  document: ReferenceDocument
): GeoreferenceCornerQuad | null => {
  const transform = document.georeference?.transform;
  if (!transform) {
    return null;
  }

  if (transform.kind === "corner_quad") {
    return transform.cornerQuad;
  }

  if (transform.kind === "affine_control_points") {
    return resolveAffineCornerQuad(transform);
  }

  return null;
};

export const getGeoreferenceSummary = (document: ReferenceDocument): string | null => {
  const georeference = document.georeference;
  if (!georeference) {
    return null;
  }

  if (!georeference.aligned) {
    return georeference.notes ?? "Alignment metadata is not ready yet.";
  }

  const quality = georeference.quality === "tuned" ? "tuned" : "approximate";
  const transformKind =
    georeference.transform?.kind === "affine_control_points"
      ? "control-point aligned"
      : "corner-aligned";
  return `${quality} ${transformKind} overlay`;
};
