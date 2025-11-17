export function getLocation(success: PositionCallback) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
    navigator.geolocation.watchPosition(success, error);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function error() {
  alert("Sorry, no position available.");
}
