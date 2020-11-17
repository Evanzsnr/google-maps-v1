import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { AgmCoreModule } from '@agm/core';
import { environment } from 'src/environments/environment.prod';
import { AgmDirectionModule } from 'agm-direction';
import { AgmSnazzyInfoWindowModule } from '@agm/snazzy-info-window';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    HomePageRoutingModule,
    AgmCoreModule.forRoot({
      apiKey: environment._APIKEY, 
      libraries: ['places']
    }),
    AgmDirectionModule,
    AgmSnazzyInfoWindowModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
