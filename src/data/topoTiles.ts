// Background map for the route maps: OpenTopoMap, a topographic style with contours and trails and no
// land-ownership overlay. Tiles need a data connection. The tile server is a volunteer project, so before a wide
// public launch, switch to a hosted tile provider (the template below is the only thing to change).
export const TOPO_TEMPLATE = 'https://tile.opentopomap.org/{z}/{x}/{y}.png';
export const TOPO_ATTRIBUTION = '© OpenTopoMap (CC-BY-SA), © OSM';
export const TOPO_MAX_ZOOM = 17;
export const topoTileUrl = (z: number, x: number, y: number) => TOPO_TEMPLATE.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
