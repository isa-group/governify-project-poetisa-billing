/*!
governify-service-sabius-data-publications 1.0.0, built on: 2018-04-27
Copyright (C) 2018 ISA group
http://www.isa.us.es/
https://github.com/isa-group/governify-service-sabius-data-publications

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.*/

/*global $:false, _:false, Morris:false, __history:false */
/*jshint browser:true*/

$(function(){
  "use strict";

  function drawHistoricalChart (history) {
    var data = _.map(history, function (record) {

      var date = new Date(record.date);
      return {
        date : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
        average_maintainability : parseFloat(record.average.maintainability),
        average_sloc : record.average.sloc
      };
    }).slice(-20);

    Morris.Area({
      element     : 'chart_historical_sloc',
      data        : data,
      xkey        : 'date',
      ykeys       : ['average_sloc'],
      parseTime   : false,
      lineColors  : ['#2A2A2A'],
      pointSize   : 0,
      lineWidth   : 0,
      grid        : false,
      axes        : false,
      hideHover   : 'always',
      fillOpacity : 1
    });

    Morris.Area({
      element     : 'chart_historical_maint',
      data        : data,
      xkey        : 'date',
      ykeys       : ['average_maintainability'],
      labels      : ['Maintainability'],
      ymax        : 100,
      parseTime   : false,
      lineColors  : ['#2A2A2A'],
      pointSize   : 0,
      lineWidth   : 0,
      grid        : false,
      axes        : false,
      hideHover   : 'always',
      fillOpacity : 1
    });
  }

  function drawCharts() {
    $('.js-chart').empty();
    drawHistoricalChart(__history);
  }

  drawCharts();

  $(window).on('resize', _.debounce(drawCharts,200));
});
