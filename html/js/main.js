const width = window.innerWidth;
const height = window.innerHeight;
const margin = 10;
const markerSize = 3;
async function main(){

  let model = await initModel({constants, url});

  let svg = new Svg('#plot', 
    width, height, margin,
    model, constants
  )
  .initControl()
  .initRecon()
  .initResetButton();

  window.svg = svg;
}

class Svg{
  constructor(id, width, height, margin, model, constants){

    this.svg = d3.select('svg' + id)
    .attr('width', width)
    .attr('height', height);
    this.width = width;
    this.height = height;
    this.margin = margin;
    this.reconSize = Math.min(width/2, height/1.2, 200);

    this.model = model;
    this.constants = constants;
  }

  initResetButton(){
    let resetButton = d3.select(this.svg.node().parentNode)
    .insert('div', ':first-child')
    .append('i')
    .attr('id', 'resetButton')
    .style('position', 'absolute')
    .style('top', '10px')
    .style('left', '10px')
    .on('mouseover', function() {
      d3.select(this).style('opacity', 1);
    })
    .on('mouseout', function() {
      d3.select(this).style('opacity', 0.7);
    })
    .attr('class', 'fas fa-sync-alt')
    .on('click', ()=>{
      this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);
    })
    return this;
  }


  initControl(){
    let constants = this.constants;

    this.sxControl = d3.scaleLinear()
    .domain(constants.xrange)
    .range([margin, width-margin-this.reconSize]);
    
    this.syControl = d3.scaleLinear()
    .domain(constants.yrange)
    .range([height-margin, margin]);

    this.markerSc = d3.scaleOrdinal()
    .domain(d3.range(9))
    .range(d3.schemeCategory10);

    this.markers = this.svg.selectAll('.marker')
    .data(data.embeddings.slice(0,4000))
    .enter()
    .append('circle')
    .attr('class', 'marker');
    this.markers = this.svg.selectAll('.marker')
    .attr('cx', d=>this.sxControl(d[0]))
    .attr('cy', d=>this.syControl(d[1]))
    .attr('r', markerSize)
    .attr('fill', (d,i)=>this.markerSc(data.labels[i]));

    this.ax = d3.axisBottom(this.sxControl)
    .tickSizeInner(-this.height)
    .ticks(10);
    this.gx = this.svg.append('g')
    .attr("transform", `translate(0,${this.height})`)
    .call(this.ax);

    this.ay = d3.axisLeft(this.syControl)
    .tickSizeInner(-this.width)
    .ticks(5);

    this.gy = this.svg.append('g')
    .attr("transform", `translate(${0}, 0)`)
    .call(this.ay);

    this.controlRect = this.svg.selectAll('.control')
    .data([constants])
    .enter()
    .append('rect')
    .attr('class', 'control');

    this.controlRect = this.svg.selectAll('.control')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', this.width)
    .attr('height', this.width)
    .attr('fill', 'white')
    .attr('opacity', 0)
    .on('mousemove', ()=>{
      let x = d3.event.clientX;
      let y = d3.event.clientY;
      if (this.rx === undefined){
        this.rx = this.sxControl;
        this.ry = this.syControl;

      }
      this.drawWithParameter([
        this.rx.invert(x),
        this.ry.invert(y)]);
    });

    this.zoom = d3.zoom()
    .on("zoom", ()=>{
      let k = d3.event.transform.k;
      this.markers
      .attr("transform", d3.event.transform)
      .attr('r', markerSize/Math.sqrt(k));
      //rescaled sx and sy
      this.rx = d3.event.transform.rescaleX(this.sxControl);
      this.ry = d3.event.transform.rescaleY(this.syControl);

      this.gx.call(this.ax.scale(this.rx));
      this.gy.call(this.ay.scale(this.ry));
    });
    this.svg.call(this.zoom);
    return this;
  }


  initRecon(){ //the RECONstructed image 
    
    this.sxRecon = d3.scaleLinear()
    .domain([0,28])
    .range([
      this.width-this.reconSize-this.margin, 
      this.width-this.margin
    ]);
    
    this.syRecon = d3.scaleLinear()
    .domain([0,28])
    .range([this.margin, this.margin+this.reconSize]);
    
    this.scRecon = d3.interpolateViridis;

    this.imgRect = this.svg.selectAll('.imgRect')
    .data(d3.range(784))
    .enter()
    .append('rect')
    .attr('class', 'imgRect')
    .attr('x', (d,i)=>this.sxRecon(i%28))
    .attr('y', (d,i)=>this.syRecon(Math.floor(i/28)))
    .attr('width', this.sxRecon(1)-this.sxRecon(0)+1)
    .attr('height', this.syRecon(1)-this.syRecon(0)+1); 
    return this;
  }

  drawWithParameter(param){
    let img = newImg(param, this.model);
    this.drawImg(img);
  }

  drawImg(img){
    this.imgRect
    .data(img)
    .attr('fill', d=>svg.scRecon(d));
  }
  
}



//========= utils ==========
async function initModel(config){
  let constants = config.constants;
  let url = config.url;
  let model = await tf.loadLayersModel(url);
  model.constants = constants;
  return model;
}


function newImg(parameters, model){ 
  //parameters: a tf tensor, 2d coordinate in the embedding
  //model: a tf model, the 2d to image decoder 
  //
  if(parameters===undefined){
    parameters = tf.randomUniform([1,2]);
  }else{
    parameters = tf.tensor2d(parameters, [1,2]);
  }
  parameters = parameters.reshape([1,2]);
  let reconstructed = model.predict(parameters).dataSync();
  reconstructed = Array.from(reconstructed);
  return reconstructed;
}

document.addEventListener('DOMContentLoaded', main);












