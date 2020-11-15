import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Platform, ModalController } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderResult, NativeGeocoderOptions } from '@ionic-native/native-geocoder/ngx';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, LatLng, MarkerOptions, Marker, Encoding, ILatLng, LatLngBounds, Polyline } from "@ionic-native/google-maps";

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  public map: GoogleMap;
  public path: Polyline;
  public pickUpMarker: Marker;
  public dropOffMarker: Marker;
  public origin: any = {};
  public destination: any = {};
  public lat: any;
  public lng: any;
  public address;
  
  constructor(
    public platform: Platform,
    public modalCtrl: ModalController,
    private geolocation: Geolocation
  ){}

  ngOnInit() {
    this.platform.ready().then(() => {
      this.getCurrentPosition();        
    });
  }
  
  public getCurrentPosition(){
    this.geolocation.getCurrentPosition()
    .then((resp) => {
      // Set current position.
      this.lat = resp.coords.latitude;
      this.lng = resp.coords.longitude;
      // Create the map.
      this.createMap();
  }
          
  public createMap(){
    // Set the coordinates.
    const coordinates: LatLng = new LatLng(this.lat, this.lng);

    /* The create() function will take the ID of your map element */
    this.map = GoogleMaps.create('map', {
      styles: [
        {
          "featureType": "poi.business",
          "stylers": [
            { "visibility": "off" }
          ]
        },
        {
          "featureType": "transit.station.bus",
          "stylers":  [
            { "visibility": "off" }
          ]
        }
      ],
      camera: {
        target: coordinates,
        zoom: this.zoom
      },
      controls: {
        compass: false,
        myLocationButton: true,
        myLocation: true
      }
    });

  }
    
  async openSelectionPage(){
    const modal = await this.modalCtrl.create({
      component: SelectLocationPage
    });
    modal.onDidDismiss()
    .then((res) => {
      if(res !== null){
        if(res.data.origin && res.data.destination){
          this.origin = res.data.origin;
          this.destination = res.data.destination;
          // Start navigating
          this.startNavigating(this.origin, this.destination);
        }
      }
    })
    .catch();
    return await modal.present();
  }
  
  public startNavigating(origin, destination){
    let directionsService = new google.maps.DirectionsService;
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode['DRIVING']
    }, (res, status) => {
      if(status == google.maps.DirectionsStatus.OK){
        // decode overview_polyline from direction services.
        let decodedPoints: ILatLng[] = Encoding.decodePath(res.routes[0].overview_polyline);
        // Draw the polyline path.
        this.drawPolyline(decodedPoints);
      } else {
          console.warn(status);
      }
    });
  }
    
  public drawPolyline(points: ILatLng[]){
    
    let markerOptionsPickup: MarkerOptions = {
        position: points[0],
        icon: {
          url: "assets/icon/start-marker.png",
          size: {
            width: 25,
            height: 35
          }
        },
        title: this.origin.name,
        zIndex: 99999999999,
        disableAutoPan: true
    }

    let markerOptionsDropOff: MarkerOptions = {
        position: points[points.length - 1],
        icon: {
          url: "assets/icon/stop-marker.png",
          size: {
            width: 25,
            height: 35
          }
        },
        title: this.destination.name,
        zIndex: 99999999999,
        disableAutoPan: true
    }

    // Add markers
    this.pickUpMarker = this.map.addMarkerSync(markerOptionsPickup);
    this.dropOffMarker = this.map.addMarkerSync(markerOptionsDropOff);

    let latLngBounds = new LatLngBounds(points);
    this.map.animateCamera({
      target: latLngBounds,
      duration: 1000
    });
    
    // Add the polyline route.
    this.path = this.map.addPolylineSync({
      points: points,
      color: '#3171e0',
      width: 5, 
      geodesic: true,
      clickable: false,
      zIndex: 3
    });
  }
  
}
