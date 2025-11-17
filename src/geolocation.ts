let trackingID: number = -1;

export function stopLocationTracking(): void {
  if (trackingID == -1) {
    throw new Error("Attempt to stop nonexistent location tracking.");
  }
  navigator.geolocation.clearWatch(trackingID);
  trackingID = -1;
}

export function startLocationTracking(success: PositionCallback): void {
  if (trackingID != -1) {
    throw new Error(
      "Attempt to start multiple instances of location tracking.",
    );
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
    trackingID = navigator.geolocation.watchPosition(success, error);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function error() {
  alert("Sorry, no position available.");
}
