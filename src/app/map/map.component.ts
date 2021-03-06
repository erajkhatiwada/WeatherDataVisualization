import { SharedService } from './../providers/shared/shared.service';
import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { throwError } from 'rxjs';
import {
  trigger,
  state,
  style,
  animate,
  transition
} from '@angular/animations';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  animations: [
    trigger('popOverState', [
      state('show', style({
        transform: 'scale(0.5) translateX(-50%) translateY(-40%)'
      })),
      state('hide',   style({
        transform: 'scale(1)'
      })),
      transition('show => hide', animate('600ms ease-out')),
      transition('hide => show', animate('1000ms ease-in'))
    ]),
  ]
})
export class MapComponent implements OnInit {
  data: any;
  temp:any;
  state: any;
  allTempData: any;
  stateTemp: any;
  isClicked = false;
  apiValue: any;
  show = false;
  displayStateNameOnCardHeader: any;
  citiesShow = false;
  showGraph = false;
  fiveDaysWeatherForecast: any;
  showCurrentWeather:boolean = true;
  tempBoolean:boolean = false;
  constructor(public _sharedService: SharedService) { }
  ngOnInit() {
    this.createMap();
    this.createCities("01");
  }

  createMap() {
      let newThis = this; //this will allow us to use angular components inside d3
      const svg = d3.select('svg');
      const nameState = {};
      const path = d3.geoPath();
      let tooltip = d3.select("#tool")
      .append("div")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      /* .text(nameState); */
      d3.json('https://d3js.org/us-10m.v1.json').then((us) => {
          const data = topojson.feature(us, us.objects.states).features;
          d3.tsv('../../assets/us-state-names.tsv').then((tsv) => {
            // extract just the names and Ids
            const names = {};
            tsv.forEach(function(d, i) {
              names[d.id] = d.code;
              nameState[d.id] = d.name;
              //debugger
            });
            svg.append('g')
            .attr('class', 'states')
            .selectAll('path')
            .data(data)
            .enter().append('path')
              .attr('d', path).
              style("stroke", "red")
              .on('click', function(d, i) {
                d3.select(this).attr('class', 'tooltip-donut')
                .style('opacity', 0.1)
                .style('opactiy', 1.0);
                //trigger animation
                newThis.show = true;
                //newThis.stateNameClicked = nameState[d.id];
                //newThis.alertWithWeatherData(nameState[d.id]); //calling api
                newThis.createCities(d.id);
              })
              .on('mouseover', function(d, i) {
               // console.log(d.id);
                newThis.displayStateNameOnCardHeader = nameState[d.id]
                return tooltip.style("visibility", "visible").text(nameState[d.id])
                .style("hover", 'silver')
                .style('margin-left', '37%')
                .style('font-size', '50px')
                .style('margin-top', '3%');
              });
            svg.append('path')
              .attr('class', 'state-borders')
              .attr('d', path(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; })))
              .style('fill', 'none')
              .style('stroke', 'silver')
              .style('stroke-width', '1.0px')
              .style('stroke-linejoin', 'round')
              .style('stroke-linecap', 'round')
              .style('pointer-events', 'none');
            svg.append('g')
              .attr('class', 'states-names')
              .selectAll('text')
              .data(data);
      });
      }).catch((error) => {
          throwError;
        });

  }
  get stateName() {
    return this.show ? 'show' : 'hide';
  }

  alertWithWeatherData(state) {
    this._sharedService.getStateWeather(state).subscribe(res => {
      this.apiValue = res;
      this.isClicked = true;
      let message = "Temperature: "+(this.convertKtoF(res["main"].temp))+" F\n"+ '<br />' +
                    "<br />Max Temperature: "+ (this.convertKtoF(res['main'].temp_max))+' F\n <br>'+
                    '<br />Min Temperature: '+ (this.convertKtoF(res['main'].temp_min))+' F\n <br>'+
                    '<br />Sunrise: '+ (this.convertTimeStampToDate(res['sys'].sunrise))+'\n <br>'+
                    '<br />Sunset: '+ (this.convertTimeStampToDate(res['sys'].sunset))+'\n <br>';
      //window.alert(message);
      this.stateTemp = 'State: '+state+'\n <br>';
      this.allTempData = message;
    }, error => {
      window.alert('Not found! Please try again later');
    });
  }

  convertKtoF(K){
    return (((K-273.15)*1.8)+32).toFixed(2);
  }

  convertTimeStampToDate(timesStamp){
    return new Date(timesStamp*1000).toLocaleTimeString();
  }

  createCities(id:any) {
    if(this.tempBoolean){
      this.showCurrentWeather = false;
    }
    this.tempBoolean = true;
    var self = this;
    this.citiesShow = true;
    let diameter = 400;
    let json = this._sharedService.getJson();

    let colorScale = d3.scaleLinear()
      .domain([0, d3.max(json[Number(id)].children, function(d) {
        return d.value;
      })])
      .range(['rgb(46, 73, 123)', 'rgb(71, 187, 94)']);

    let bubble = d3.pack()
        .size([diameter, diameter])
        .padding(5);

    const margin = {
        left: 0,
        right: 100,
        top: 0,
        bottom: 0
      };
    d3.select('#chart').selectAll('svg').remove();
    let svg = d3.select('#chart').append('svg')
        .attr('viewBox','0 0 ' + (diameter + margin.right) + ' ' + diameter)
        .attr('width', (diameter + margin.right))
        .attr('height', diameter)
        .attr('class', 'chart-svg');

    let root = d3.hierarchy(json[Number(id)])
        .sum(function(d) { return d.value; })
        .sort(function(a, b) { return b.value - a.value; });

    bubble(root);

    let node = svg.selectAll('.node')
        .data(root.children)
        .enter()
        .append('g').attr('class', 'node')
        .attr('transform', function(d) { return 'translate(' + d.x + ' ' + d.y + ')'; })
        .append('g').attr('class', 'graph')
        .on('click', function(d, i) {
          self.showGraph = false;
          self._sharedService.getFiveDaysForecastData(d.data.name).subscribe(res => {
            self.fiveDaysWeatherForecast = res;
            self.showGraph = true;
          });
        });

    node.append('circle')
        .attr('r', function(d) { return d.r; })
        .style('fill', '#966c01d1');

    node.append('text')
        .attr('dy', '.3em')
        .style('text-anchor', 'middle')
        .text(function(d) { return d.data.name; })
        .style('fill', '#00000');
    node.exit()
        .transition()
        .attr('r', 0)
        .remove();
  }

}
