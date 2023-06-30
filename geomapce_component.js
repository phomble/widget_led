(function() {
    let template = document.createElement("template");
    var gPassedServiceType; // holds passed in guarantee of service - set in onCustomWidgetBeforeUpdate()
    var gPassedPortalURL; //ESRI Portal URL
    var gPassedAPIkey; //ESRI JS api key
    var gPassedHSToken; //HS Token
    var gWebmapInstantiated = 0; // a global used in applying definition query
    var gMyLyr; // for sublayer
    var gMyWebmap; // needs to be global for async call to onCustomWidgetAfterUpdate()

    //#viewDiv for mapview
    
    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        #mapview {   
            padding: 0;
            margin: 0;
          height: 100%;
          width: 100%;
        }
      .esri-ui-corner .esri-component.esri-widget--panel {
    width: 230px !important;
};
        </style>
        <div id='mapview'></div>
       
    `;


//filter
// SQL query array
      const parcelLayerSQL = ["Choose a SQL where clause...", "UseType = 'Residential'",  "UseType = 'Government'", "UseType = 'Irrigated Farm'", "TaxRateArea = 10853", "TaxRateArea = 10860", "TaxRateArea = 08637", "Roll_LandValue > 1000000", "Roll_LandValue < 1000000"];
      let whereClause = parcelLayerSQL[0];
      // Add SQL UI
      const select = document.createElement("select","");
      select.setAttribute("class", "esri-widget esri-select");
      select.setAttribute("style", "width: 200px; font-family: 'Avenir Next'; font-size: 1em");
      parcelLayerSQL.forEach(function(query){
        let option = document.createElement("option");
        option.innerHTML = query;
        option.value = query;
        select.appendChild(option);
      });
      view.ui.add(select, "top-right");
       // Listen for changes
      select.addEventListener('change', (event) => {
        whereClause = event.target.value;
        queryFeatureLayer(view.extent);
      });

      // Get query layer and set up query
      const parcelLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/LA_County_Parcels/FeatureServer/0",
          gMyLayer=parselLayer;
      });

      function queryFeatureLayer(extent) {
        const parcelQuery = {
         where: whereClause,  // Set by select element
         spatialRelationship: "intersects", // Relationship operation to apply
         geometry: extent, // Restricted to visible extent of the map
         outFields: ["APN","UseType","TaxRateCity","Roll_LandValue"], // Attributes to return
         returnGeometry: true
        };
        parcelLayer.queryFeatures(parcelQuery)
        .then((results) => {
          displayResults(results);
        }).catch((error) => {
          console.log(error.error);
        });
      };

      function displayResults(results) {
        // Create a blue polygon
        const symbol = {
          type: "simple-fill",
          color: [ 20, 130, 200, 0.5 ],
          outline: {
            color: "white",
            width: .5
          },
        };
        const popupTemplate = {
          title: "Parcel {APN}",
          content: "Type: {UseType} <br> Land value: {Roll_LandValue} <br> Tax Rate City: {TaxRateCity}"
        };
        // Assign styles and popup to features
        results.features.map((feature) => {
          feature.symbol = symbol;
          feature.popupTemplate = popupTemplate;
          return feature;
        });
        // Clear display
        view.popup.close();
        view.graphics.removeAll();
        // Add features to graphics layer
        view.graphics.addMany(results.features);
      };
    });

///filter    
    

    class Map extends HTMLElement {
        constructor() {
            super();
            
            //this._shadowRoot = this.attachShadow({mode: "open"});
            this.appendChild(template.content.cloneNode(true));
            this._props = {};
            let that = this;

            require([
                 "esri/config",
                  "esri/Map",
                  "esri/views/MapView",
                  "esri/layers/FeatureLayer",
    ], (esriConfig, Map, MapView, FeatureLayer)=> {
        //

      esriConfig.apiKey = "AAPKbe7b507e8edb44dfb63ca6aa6d13507fYqdAozH2WMvdlQbvKEmQDcXQ13ceYpzWv9oetw1LNAP6AMHd-BU9OQRPOqNph05A";

      const map = new Map({
        basemap: "arcgis-topographic" //Basemap styles service
      });
      const view = new MapView({
        container: "mapview",
        map: webmap,
        center: [-118.80543,34.03000], //Longitude, latitude
        zoom: 13,
        constraints: {
          snapToZoom: false
        }                
     });
 
            


        getSelection() {
            return this._currentSelection;
        }

        onCustomWidgetBeforeUpdate(changedProperties)
        {
            this._props = { ...this._props, ...changedProperties };
           // console.log(["Service Level",changedProperties["servicelevel"]]);

        }

        onCustomWidgetAfterUpdate(changedProperties) 
        {
            if ("servicelevel" in changedProperties) {
                this.$servicelevel = changedProperties["servicelevel"];
            }
            gPassedServiceType = this.$servicelevel; // place passed in value into global

            if ("portalurl" in changedProperties) {
                this.$portalurl = changedProperties["portalurl"];
            }
            gPassedPortalURL = this.$portalurl; // place passed in value into global

            if ("apikey" in changedProperties) {
                this.$apikey = changedProperties["apikey"];
            }
            gPassedAPIkey = this.$apikey; // place passed in value into global
            
            if ("hstoken" in changedProperties) {
                this.$hstoken = changedProperties["hstoken"];
            }
            gPassedHSToken = this.$hstoken; // place passed in value into global

            // only attempt to filter displayed service locations if the webmap is initialized
           if (gWebmapInstantiated === 1) {
                applyDefinitionQuery();
            }
        }
    } // end of class




    let scriptSrc = "https://js.arcgis.com/4.18/"
    let onScriptLoaded = function() {
        customElements.define("com-sap-custom-geomapce", Map);
    }

    //SHARED FUNCTION: reuse between widgets
    //function(src, callback) {
    let customElementScripts = window.sessionStorage.getItem("customElementScripts") || [];
    let scriptStatus = customElementScripts.find(function(element) {
        return element.src == scriptSrc;
    });

    if (scriptStatus) {
        if(scriptStatus.status == "ready") {
            onScriptLoaded();
        } else {
            scriptStatus.callbacks.push(onScriptLoaded);
        }
    } else {
        let scriptObject = {
            "src": scriptSrc,
            "status": "loading",
            "callbacks": [onScriptLoaded]
        }
        customElementScripts.push(scriptObject);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptSrc;
        script.onload = function(){
            scriptObject.status = "ready";
            scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
        };
        document.head.appendChild(script);
    }

//END SHARED FUNCTION
})(); // end of class
