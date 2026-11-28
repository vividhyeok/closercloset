// All attachment coordinates share the doll's 400 × 600 registration frame.
// Assets are approved at authoring time; the browser never generates clothing.
export const ATTACHMENTS = {
  male: {
    hood: [[162,99],[177,94],[197,110],[209,116],[223,106],[239,97],[252,108],[244,127],[227,137],[225,174],[215,174],[215,139],[195,137],[195,174],[185,174],[184,136],[164,126]],
    pufferCollar: [[155,94],[256,94],[250,117],[232,124],[179,124],[158,116]],
    hairline: 49,
  },
  female: {
    hood: [[168,113],[179,106],[197,119],[214,129],[231,116],[246,108],[256,119],[248,137],[232,147],[231,181],[221,181],[221,148],[203,147],[202,181],[192,181],[191,145],[173,136]],
    pufferCollar: [[160,105],[263,105],[256,128],[237,136],[187,136],[164,127]],
    hairline: 61,
  },
};

export function localPolygon(world, dest) {
  const [x,y,w,h] = dest;
  return world.map(([px,py]) => [(px-x)/w,(py-y)/h]);
}

export function exposedHood(under, upper) {
  // A buried hood must not jump through another sweater or another hood.
  return upper?.category === 'outer' && under.at(-1)?.id === 'hoodie';
}
