import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { MapsAPILoader } from '@agm/core';
import { DataService } from '../services/data/data.service';
import { environment } from 'src/environments/environment.prod';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderResult, NativeGeocoderOptions } from '@ionic-native/native-geocoder/ngx';
import { SelectLocationPage } from '../select-location/select-location.page';
import { Platform, ModalController, LoadingController, IonRouterOutlet, AlertController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage';
import { CallNumber } from '@ionic-native/call-number/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ScheduleTripPage } from '../schedule-trip/schedule-trip.page';
import { AngularFirestore } from '@angular/fire/firestore';
import 'firebase/firestore';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, LatLng, MarkerOptions, Marker, Encoding, ILatLng, LatLngBounds, Polyline } from "@ionic-native/google-maps";
import { map } from 'rxjs/operators';
import { CupertinoPane, CupertinoSettings } from 'cupertino-pane';
import { Observable } from 'rxjs';

declare var google;

export interface Address {
  name: string,
  lat: number,
  lng: number
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  @ViewChild('directionsPanel', { static: false }) directionsPanel: ElementRef;

  public map: GoogleMap;
  public driver_marker: Marker;
  public path: Polyline;
  public pickUpMarker: Marker;
  public dropOff: Marker;
  public searchPane: CupertinoPane;
  public headerPane: CupertinoPane;
  public searchPaneSettings: CupertinoSettings;
  public headerPaneSettings: CupertinoSettings;
  public _showHeaderPane: boolean;
  public origin: any = {};
  public destination: any = {};
  public lat: any;
  public lng: any;
  public zoom: number;
  public radius: number;
  public styles: any = {};
  public mapType: any;
  public marker: boolean;
  public ongoing: boolean;
  public loader: boolean;
  public distance: any;
  public dist: any;
  public time: any;
  public route: any;
  public check: any;
  public client: any = {};
  public driver: any = {};
  public trip: any = {};
  public show_driver: boolean;
  public onTrip: boolean;
  public disableDefaultUI: boolean = true;
  public address;
  public watch: any;
  public allowSetCenter: boolean;
  public info: FormGroup;
  public trip_mode: any;
  public luggage: any = [];
  public lug: number;
  public rating: any;
  public booking_types: any = [];
  public companions: number = 0;
  public price: number;
  luggageActionSheet: any = {
    header: 'Select Luggage Category'
  };
  public luggageData: any = {
    name: 'None',
    quantity: 0,
    price: 0.00
  };
  public defaultLuggageValue: any;
  public collection = 'trips';
  public driverETA: any;

  addresses: any = [];
  searchOrigin: any;
  searchDestination: any;
  location: string;
  public show_menu_button: boolean;
  public show_back_button: boolean;

  constructor(
    public router: Router,
    public platform: Platform,
    private mapsAPILoader: MapsAPILoader,
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
    public dataService: DataService,
    public modalCtrl: ModalController,
    public loadingCtrl: LoadingController,
    public apiService: ApiService,
    public formBuilder: FormBuilder,
    public storage: Storage,
    public routerOutlet: IonRouterOutlet,
    public callNumber: CallNumber,
    private alertCtrl: AlertController,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private firestore: AngularFirestore,
    private ngZone: NgZone,
    private mapsApiLoader: MapsAPILoader
  ) {

    this.show_menu_button = true;

    this.storage.get(environment._CLIENT)
    .then((res: any) => {
      this.client = res;
    });

    this.info = formBuilder.group({
      trip_mode: ['', Validators.compose([Validators.required])],
      luggage: ['', Validators.compose([Validators.required])],
      companions: ['', Validators.compose([Validators.required])]
    });

    this.headerPaneSettings = {
      inverse: true,
      buttonClose: false,
      initialBreak: 'bottom',
      lowerThanBottom: false,
      handleKeyboard: false,
      showDraggable: false,
      draggableOver: false,
      clickBottomOpen: false,
      breaks: {
        top: { // Topper point that pane can reach
          enabled: false, // Enable or disable breakpoint
        },
        middle: {
          enabled: false
        },
        bottom: {
          enabled: true,
          height: 180,
          bounce: true
        }
      }
    };

    this.searchPaneSettings = {
      pushMinHeight: 200,
      buttonClose: false,
      initialBreak: 'bottom',
      lowerThanBottom: false,
      touchMoveStopPropagation: true,
      handleKeyboard: false,
      clickBottomOpen: false,
      // simulateTouch: false,
      breaks: {
        top: { // Topper point that pane can reach
          enabled: true, // Enable or disable breakpoint
          height: 550, // Pane breakpoint height
          bounce: true // Bounce pane on transition
        },
        middle: {
          enabled: false,
          // height: 300,
          // bounce: true
        },
        bottom: {
          enabled: true,
          height: 250,
          bounce: true
        }
      }
    };
    
  }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.allowSetCenter = true;
      this.checkGPSPermission();
    });
  }

  //Check if application having GPS access permission  
  checkGPSPermission() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
      result => {
        if (result.hasPermission) {

          //If having permission show 'Turn On GPS' dialogue
          this.askToTurnOnGPS();
        } else {

          //If not having permission ask for permission
          this.requestGPSPermission();
        }
      },
      err => {
        alert(err);
      }
    );
  }

  requestGPSPermission() {
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        console.log("4");
        // the accuracy option will be ignored by iOS
        // this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
        //   () => console.log('Request successful'),
        //   error => console.log('Error requesting location permissions', error)
        // );
      } else {
        //Show 'GPS Permission Request' dialogue
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(
            () => {
              // call method to turn on GPS
              this.askToTurnOnGPS();
            },
            error => {
              //Show alert if user click on 'No Thanks'
              alert('requestPermission Error requesting location permissions ' + error)
            }
          );
      }
    });
  }

  askToTurnOnGPS() {
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
      () => {
        // When GPS Turned ON call method to get Accurate location coordinates
        // this.getCurrentLocation()
        
        this.getMapStyles();
        this.getClient();
        // this.marker = true;
        // this.initMap();

      },
      error => alert('Error requesting location permissions ' + JSON.stringify(error))
    );
  }

  public getClient(){
    // Get client details.
    this.storage.get(environment._CLIENT)
    .then((client: any) => {
      if(client){
        this.apiService.restoreStatus(client.id, environment.STATUS_PENDING, environment.STATUS_COMPLETE, environment.STATUS_CANCELLED)
        .subscribe((res: any) => {
          if(res){
            if(res.status === 200){

              if(res.trip){
                this.trip = res.trip;
                this.storage.set(environment._TRIP, this.trip);

                this.ongoing = false;
                this.marker = false;

                // Set origin
                this.origin = {
                  name: res.trip.origin,
                  lat: res.trip.origin_lat,
                  lng: res.trip.origin_lng
                };
                
                // Set destination
                this.destination = {
                  name: res.trip.destination,
                  lat: res.trip.dest_lat,
                  lng: res.trip.dest_lng
                };

                if(res.trip.status === environment.STATUS_PENDING){
                  // Trip was pending.
                  this.marker = false;
                  this.ongoing = true;
                  this.loader = true;
                  this.check = setInterval(() => {
                    this.checkForDriver(res.trip.id);
                  }, 3000);
                }else if(res.trip.status === environment.STATUS_ACCEPTED){
                  // Trip was accepted by driver.
                  this.driver = res.trip.driver;
                  this.getActiveCar(this.driver.car);
  
                  this.marker = false;
                  this.loader = false;
                  this.ongoing = true;
                  this.show_driver = true;
                  this.check = setInterval(() => {
                    this.checkIfTripStarted(res.trip.id);
                  }, 3000);
                }else if(res.trip.status === environment.STATUS_STARTED){
                  // trip  was started and ongoing.
                  this.driver = res.trip.driver;
                  this.getActiveCar(this.driver.car);
  
                  this.marker = false;
                  this.ongoing = true;
                  this.onTrip = true;
                  this.show_driver = true;
                  this.check = setInterval(() => {
                    this.checkIfTripEnded(res.trip.id);
                  }, 3000);
                }else if(res.trip.status === environment.STATUS_COMPLETE){
                  this.marker = false;
                  this.onTrip = false;
                  this.show_driver = false;
                  this.ongoing = false;
                  this.cancel();
                  // Check if the driver was rated or not.
                  if(res.trip_status){
                    if(res.trip_status === environment.STATUS_PENDING){

                      // Disable the hardware back button to prevent anomalies.
                      this.platform.backButton.subscribeWithPriority(10, () => {});
                      
                      this.dataService.setData(9, res.trip.driver);
                      this.router.navigateByUrl('/rate-driver/9');
                    }else if(res.trip_status === environment.STATUS_COMPLETE){
                      // Trip was complete and driver was rated.
                      this.initMap(true);
                    }
                  }
                }else if(res.trip.status === environment.STATUS_CANCELLED){
                  this.loader = false;
                  this.ongoing = false;
                  this.cancel();
                  // this.getCurrentLocation();
                  this.initMap();
                  // Check if the trip still exists.
                  this.storage.get(environment._TRIP).then((trip) => {
                    if(trip){
                      this.storage.remove(environment._TRIP);
                    }
                  });
                }

              }

            }else if(res.status === 404){
              // Client has no trip yet.
              this.initMap();
            }
          }
        });
      }
    });

  }

  initMap(reload ?: boolean){
    if(reload && reload === true){
      this.zoom = 16;
    }
    this.getCurrentLocation();
    this.getMapStyles();
  }

  getMapStyles(){
    return this.dataService.getMapStyles()
    .subscribe((data) => {
      this.styles = data.styles;
      this.zoom = data.zoom;
      this.mapType = data.mapType;
      this.radius = environment._RADIUS;
    });
  }

  getCurrentLocation(){
    this.geolocation.getCurrentPosition()
    .then((resp) => {
      // Set current position.
      this.lat = resp.coords.latitude;
      this.lng = resp.coords.longitude;
      // Initialize the map.
      this.createMap();
    })
    .catch((error) => {
      console.error(error);
    });
  }

  public createMap(){
    // Set the coordinates.
    const coordinates: LatLng = new LatLng(this.lat, this.lng);
    /* The create() function will take the ID of your map element */
    this.map = GoogleMaps.create('map', {
      styles: [
        // {
        //   "featureType": "poi.business",
        //   "stylers": [
        //     { "visibility": "off" }
        //   ]
        // },
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

    this.map.one( GoogleMapsEvent.MAP_READY ).then(() => {
      this.map.setPadding(0, 0, 200, 0);
      this.searchPane = new CupertinoPane('.cupertino-pane', this.searchPaneSettings);
      this.searchPane.present({animate: true});
      this.searchPane.disableDrag();
      this.marker = true;
      this.headerPane = new CupertinoPane('.header-pane', this.headerPaneSettings);
      this._showHeaderPane = true;
    });

  }

  public showHeaderPane(){
    this.headerPane.present({animate: true});
    this.headerPane.disableDrag();
    this.searchPane.moveToBreak('top');
  }

  public hideHeaderPane(){
    this.headerPane.hide();
  }

  public dismiss(){
    this.show_menu_button = true;
    this.addresses = [];
    // this.origin = undefined;
    // this.destination = undefined;
    this.searchOrigin = undefined;
    this.searchDestination = undefined;
    this.headerPane.hide();
    this.searchPane.moveToBreak('bottom');
  }

  public openSearch(){
    this.show_menu_button = false;
    this.showHeaderPane();
  }

  public startNavigating(origin, destination){
    let directionsService = new google.maps.DirectionsService;
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode['DRIVING']
    }, (res, status) => {
      if(status == google.maps.DirectionsStatus.OK){
        this.time = `${res.routes[0].legs[0].duration.text}`;
        this.dist = `${res.routes[0].legs[0].distance.text}`;
        this.route = `via ${res.routes[0].summary}`;
        let distance = res.routes[0].legs[0].distance.text;
        this.distance = Number(distance.slice(0, -2));        
        // Set the price.
        this.price = this.distance * environment.PRICE_PER_KM;
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
    };
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
    };
    // Add markers
    this.pickUpMarker = this.map.addMarkerSync(markerOptionsPickup);
    this.dropOff = this.map.addMarkerSync(markerOptionsDropOff);
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

  async openSelectionPage(){
    const modal = await this.modalCtrl.create({
      component: SelectLocationPage
    });
    modal.onDidDismiss()
    .then((res) => {
      if(res !== null){
        if(res.data.origin && res.data.destination){
          this.marker = false;
          this.origin = res.data.origin;
          this.destination = res.data.destination;
          this.allowSetCenter = false;
          // Start navigating
          this.startNavigating(this.origin, this.destination);
          // Get the luggage data.
          this.getLuggageData();
        }
      }
    })
    .catch();
    return await modal.present();
  }

  public centerMyLocation(){
    this.map.getMyLocation().then((res) => {
      this.map.animateCamera({
        target: res.latLng,
        duration: 1000,
        zoom: this.zoom
      });
    });
  }

  cancel(){
    this.origin = undefined;
    this.destination = undefined;
    this.time = undefined;
    this.dist = undefined;
    this.route = undefined;
    this.distance = undefined;
    this.trip = {};
    this.allowSetCenter = true;
    this.ongoing = false;
    this.loader = false;
    this.show_driver = false;
    this.info.reset();
    if(this.map){
      // this.path.remove();
      // this.map.clear();
      this.centerMyLocation();
    }
    this.price = undefined;
    this.show_back_button = false;
    this.show_menu_button = true;
    if(this.searchPane){
      console.log(this.searchPane.currentBreak())
      if(this.searchPane.currentBreak() == 'bottom'){
        
      }else{
        this.searchPane.moveToBreak('bottom');
      }
    }
    this.initMap(true);
  }

  onSearchChange(event: any, location: string){
    if(event.target.value){
      this.location = location;
      this.mapsApiLoader.load().then(() => {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: event.target.value, componentRestrictions: { country: 'UG' } }, (predictions, status) => {
          this.addresses = [];
          this.ngZone.run(() => {
            if (predictions != null) {
              predictions.forEach((prediction) => {
                this.addresses.push(prediction.description);
              });
            }
          });
        });
      }).catch((error) =>console.error(error));
    }
  }

  chooseAddress(e: any) {
    this.getLatLng(e).subscribe((result: any) => {
      this.ngZone.run(() => {
        if(this.location === 'origin'){
          this.origin = {
            name: e,
            lat: result.lat(),
            lng: result.lng()
          };
          this.searchOrigin = e;
          this.addresses = [];
        }
        if(this.location === 'destination'){
          this.destination = {
            name: e,
            lat: result.lat(),
            lng: result.lng()
          };
          this.searchDestination = e;
          this.addresses = [];
        }
        if(this.origin && this.destination){
          // Dismiss the input fields.
          // this.searchOrigin = undefined;
          // this.searchDestination = undefined;
          // this.headerPane.hide();
          // this.searchPane.hide();
          this.show_back_button = true;
          this.dismiss();
          // Draw the polyline and add details.
          this.startNavigating(this.origin, this.destination);
        }
      });
    },
    (error) => {
      console.log(error)
    });
  }

  getLatLng(address: string) {
    const geocoder = new google.maps.Geocoder();
    return new Observable(observer => {
      geocoder.geocode({ 'address': address }, function (results: any, status: any) {
        if (status === google.maps.GeocoderStatus.OK) {
          observer.next(results[0].geometry.location);
          observer.complete();
        } else {
          observer.next({ 'err': true });
          observer.complete();
        }
      });
    });
  }

  callDriver(number){
    this.callNumber.callNumber(number, true)
    .then(res => console.log('Launched dialer!', res))
    .catch(err => console.log('Error launching dialer', err));
  }

  public getLuggageData(){
    this.apiService.getLuggageData()
    .subscribe((res: any) => {
      if(res){
        if(res.status === 200){
          this.luggage = res.luggage;
        }
      }
    });
  }

  public modifyPrice(event){
    this.trip_mode = event.detail.value;
    if(event.detail.value === 'private'){
      this.price += this.price/2;
    }else if(event.detail.value === 'public'){
      // Set the price.
      this.price = this.distance * environment.PRICE_PER_KM;
    }
  }

  public add(){
    return this.companions += 1;
  }

  public remove(){
    return this.companions -= 1;
  }

  public getSingleLuggage(){
    this.apiService.getTripLuggage(Number(this.info.value.luggage))
    .subscribe((res: any) => {
      if(res){
        if(res.status === 200){
          this.luggageData = res.luggage;
        }
      }
    });
  }

  public getCompanionPrice(qty: number, price: number){
    return this.dataService.computePrice(qty, (price * 0.7));
  }

  public getTotalPrice(){
    return this.price + this.getCompanionPrice(this.info.value.companions, this.price) + this.luggageData.price;
  }

  public confirm(){
    let trip = {
      client_id: this.client.id,
      driver: {
        id: null,
        location: {
          lat: this.lat,
          lng: this.lng
        }
      },
      origin: this.origin.name,
      origin_lat: this.origin.lat,
      origin_lng: this.origin.lng,
      destination: this.destination.name,
      dest_lat: this.destination.lat,
      dest_lng: this.destination.lng,
      travellers: this.info.value.companions,
      distance: this.distance,
      luggage_id: Number(this.info.value.luggage),
      trip_mode: this.info.value.trip_mode,
      price: this.getTotalPrice(),
      status: environment.STATUS_PENDING,
    };
    // 9ed8f030f4622972e07b6d6717899470.jpg
    this.loader = true;
    this.ongoing = true;
    const id = this.firestore.createId();
    this.firestore.doc(`${this.collection}/${id}`).set(trip)
    .then(() => {
      let con = this.firestore.collection(this.collection).doc(id).valueChanges().pipe().subscribe((res: any) => {
        if(res.status === environment.STATUS_ACCEPTED){
          if(this.show_driver !== true){
            // Get driver details.
            this.getDriverDetails(res.driver.id);
          }
          // Compute ETA
          this.computeETA(res.driver.location, this.origin);
        }else if(res.status === environment.STATUS_ARRIVED){
          // Driver has arrived.
          this.driverETA = 'Driver has arrived';
          this.apiService.showToast('Driver has arrived.', 'primary');
        }else if(res.status === environment.STATUS_STARTED){
          // Trip has started.
          this.driverETA = 'Trip ongoing';
          this.apiService.showToast('Trip has started.', 'primary');
        }else if(res.status === environment.STATUS_COMPLETE){
          // Trip has ended.
          con.unsubscribe();
          // Reset all variables to default.
          this.cancel();
          // Redirect to rating page.
          this.dataService.setData(9, this.driver);
          this.router.navigateByUrl('/rate-driver/9');
        }
      });
    })
    .catch((error) => {
      console.error(error);
    });

    // // Disable the hardware back button to prevent anomalies.
    // this.platform.backButton.subscribeWithPriority(10, () => {});
    // this.apiService.saveTrip(res.data.trip)
    // .subscribe((res: any) => {
    //   // Enable the hardware back button.
    //   this.platform.backButton.subscribeWithPriority(10, () => {
    //     // Check if the app can go back.
    //     if(!this.routerOutlet.canGoBack()){
    //       this.apiService.closeApp();
    //     }else{
    //       this.loadingCtrl.getTop().then((res) => {
    //         if(res){
    //           this.loadingCtrl.dismiss();
    //         }
    //       });
    //       this.routerOutlet.pop();
    //     }
    //   });

    //   if(res){
    //     if(res.status === 200){
    //       this.trip = res.trip;
    //       this.storage.set(environment._TRIP, res.trip);
    //       this.ongoing = true;
    //       this.loader = true;

    //       this.check = setInterval(() => {
    //         this.checkForDriver(res.trip.id);
    //       }, 3000);

    //     }else{
    //       this.apiService.showToast(res.message, 'danger');
    //     }
    //   }
    // });

  }

  public getDriverDetails(id){
    this.apiService.getDriver(id)
    .subscribe((res) => {
      if(res.status === 200){
        this.driver = res.driver;
        this.rating = res.driver_rating;
        this.getActiveCar(this.driver.car);
        this.loader = false;
        this.show_driver = true;
      }
    });
  }

  public computeETA(origin, destination){
    let directionsService = new google.maps.DirectionsService;
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode['DRIVING']
    }, (res, status) => {
      if(status == google.maps.DirectionsStatus.OK){
        this.driverETA = `${res.routes[0].legs[0].distance.text} away | ETA ${res.routes[0].legs[0].duration.text}`;
      } else {
          console.warn(status);
      }
    });
  }

  public async schedule(){
    const modal = await this.modalCtrl.create({
      component: ScheduleTripPage,
      cssClass: 'modal'
    });
    modal.onDidDismiss()
    .then((res) => {});
    return await modal.present();
  }

































  
  public checkForDriver(id){
    this.apiService.checkTripAcceptance(id, environment.STATUS_ACCEPTED)
    .subscribe((res: any) => {
      if(res){
        if(res.status === 200){
          this.driver = res.driver;

          this.getActiveCar(this.driver.car);
          
          this.loader = false;
          this.show_driver = true;

          clearInterval(this.check);

          this.check = setInterval(() => {
            this.checkIfTripStarted(id);
          }, 3000);
          
        }
      }
    });
  }

  getActiveCar(cars: []){
    cars.forEach((car: any) => {
      if(car.status === 1){
        this.driver.car = car;
      }
    });
  }

  public checkIfTripStarted(id){
    this.apiService.checkIfTripStarted(id, environment.STATUS_STARTED)
    .subscribe((res: any) => {
      if(res){
        if(res.status === 200){
          // this.apiService.showToast(res.message, 'success');
          this.onTrip = true;

          clearInterval(this.check);

          this.check = setInterval(() => {
            this.checkIfTripEnded(id);
          }, 3000);
          
        }
      }
    });
  }

  public checkIfTripEnded(id){
    this.apiService.checkIfTripEnded(id, environment.STATUS_COMPLETE)
    .subscribe((res: any) => {
      if(res){
        if(res.status === 200){
          this.onTrip = false;
          this.show_driver = false;
          this.ongoing = false;

          this.marker = false;

          this.cancel();

          // Disable the hardware back button to prevent anomalies.
          this.platform.backButton.subscribeWithPriority(10, () => {});

          clearInterval(this.check);
          this.dataService.setData(9, this.driver);
          this.router.navigateByUrl('/rate-driver/9');
        }
      }
    });
  }

  async cancelTrip(){
    const alert =  await this.alertCtrl.create({
      header: 'Cancel trip?',
      message: 'Do you want to cancel this trip?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {}
        },
        {
          text: 'Yes',
          handler: () => {
            this.apiService.cancelTrip(this.trip.id, environment.STATUS_CANCELLED)
            .subscribe((res: any) => {
              if(res){
                if(res.status === 200){
                  this.loader = false;
                  this.ongoing = false;
                  this.storage.remove(environment._TRIP);
                  this.cancel();
                }
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  

}
