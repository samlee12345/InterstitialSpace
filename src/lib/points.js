// Every point rule in one place.
export const POINTS = {
  interactOnSite: 0.25, // like, comment or vote, on site
  interactOffSite: 0.125, // off site, or location declined
  photo: 0.5, // per photo, after qualification
  scan: 1, // per scan, after qualification
  diagram: 2, // spatial diagram, always full
  redesign: 5, // redesign upload, always full
  review: 2, // approval review
  field: 0.25, // each optional detail filled in when documenting a space
};

export const interactPoints = (onSite) => (onSite ? POINTS.interactOnSite : POINTS.interactOffSite);

// Photos and scans are halved if the contributor is off site or the files have no geotag.
// Optional details (fields) add a fixed amount each, so more complete documentation earns more.
export const uploadPoints = ({ photos = 0, scans = 0, fields = 0, full = true }) =>
  (photos * POINTS.photo + scans * POINTS.scan) * (full ? 1 : 0.5) + fields * POINTS.field;

export const fmtPoints = (n) => {
  const s = (Math.round(n * 1000) / 1000).toString();
  return s;
};
