import React from 'react';
import './App.css';
import './style/html5up-dimension/assets/css/fontawesome-all.min.css';

class App extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      interval_heartbeat: 5000,
      interval_update_room_temp: 5000,
      is_checked_in: false,
      is_on: false,
      is_served: false,
      room_id: "000",
      room_temp: 0.0,
      default_room_temp: 0.0,
      ac_mode: 0,
      ac_wind: 1,
      ac_actual_wind: 1,
      ac_temp: 26.0,
      temp_min: 0,
      temp_max: 40,
      online_time: 0,
      checkin_time: "",
      power: 0,
      expense: 0,
      charge_policy: 0
    };
  }

  wind_int2str(wind) {
    switch (wind) {
      case 1: 
        return "low";
      case 2: 
        return "medium";
      case 3: 
        return "high";
      default:
        alert('Out of wind range!');
        return -1;
    }
  }

  wind_str2int(wind) {
    switch (wind) {
      case "low": 
        return 1;
      case "medium": 
        return 2;
      case "high": 
        return 3;
      default:
        alert('Out of wind range!');
        return -1;
    }
  }

  parse_res(res) {
    let json = JSON.parse(res.text);
    if (json.hasOwnProperty('Error')) {
      alert(json['Error'])
    } else {
      let room_id = json['room_id'];
      let ac_status = json['ac_status'];
      let ac_actual_wind = this.state.ac_wind;
      let is_served = this.state.is_served;
      if (ac_status !== 'off') {
        is_served = true;
        ac_actual_wind = this.wind_str2int(ac_status);
      }
      else {
        is_served = false;
      }
      let ac_temp = json['target_temp'];
      let power = json['elec'];
      let online_time = json['online_time'];
      let checkin_time = json['checkin_time'];
      let is_checked_in = json['checked'];
      let expense = json['total_money'];
      let charge_policy = json['price'];
      this.setState({
        is_checked_in: is_checked_in,
        is_served: is_served,
        room_id: room_id,
        ac_actual_wind: ac_actual_wind,
        ac_temp: ac_temp,
        online_time: online_time,
        checkin_time: checkin_time,
        power: power,
        expense: expense,
        charge_policy: charge_policy
      });
    }
    
  }
  
  componentWillUnmount() {
    clearInterval(this.interval_heartbeat);
  }

  start_order_timer(wind, temp) {
    this.interval_order = setInterval(() => this.set_ac_mode(wind, temp), 1000);
  }

  stop_order_timer() {
    this.interval_order && clearInterval(this.interval_order);
  }

  update_room_temp() {
    let room_temp = this.state.room_temp;
    let int = this.state.interval_update_room_temp;
    let ac_mode = 0;
    if (this.state.is_served) {
      if (Number(this.state.room_temp).toFixed(1) < this.state.ac_temp) {
        room_temp += (0.5 + (this.state.ac_actual_wind - 2)*0.2) / (60000 / int)
        ac_mode = 1
      } 
      else if (Number(this.state.room_temp).toFixed(1) > this.state.ac_temp){
        room_temp -= (0.5 + (this.state.ac_actual_wind - 2)*0.2) / (60000 / int)
        ac_mode = -1
      }
      this.setState({
        room_temp: room_temp,
        ac_mode: ac_mode
      })
      console.log(this.state.room_temp)
    }
    else {
      if (Number(this.state.room_temp).toFixed(1) < this.state.default_room_temp) {
        room_temp += 0.5 / (60000 / int)
      } 
      else if (Number(this.state.room_temp).toFixed(1) > this.state.default_room_temp) {
        room_temp -= 0.5 / (60000 / int)
      }
      this.setState({
        room_temp: room_temp,
        ac_mode: ac_mode
      })
      console.log(this.state.room_temp)
    }
  }

  heartbeat() {
    this.update_room_temp();
    var request = require('superagent');
    request
      .post('http://127.0.0.1:8000/api/user/heartbeat/')
      .send({"room_id": this.state.room_id, 
            "temp": Number(this.state.room_temp).toFixed(1)})
      .then(res => {
        this.parse_res(res);
      })
      .catch (err => {
        alert(err);
      });
  }

  check_in() {
    var request = require('superagent');
    request
      .get('http://127.0.0.1:8000/api/user/checkin/')
      .then(res => {
        this.parse_res(res);
        let json = JSON.parse(res.text);
        let temp_min = json['temp_min'];
        let temp_max = json['temp_max'];
        let room_temp = json['temp'];
        let default_room_temp = room_temp;
        this.setState({
          temp_min: temp_min,
          temp_max: temp_max,
          room_temp: room_temp,
          default_room_temp: default_room_temp
          }); 
          this.interval_heartbeat = setInterval(() => this.heartbeat(), this.state.interval_heartbeat);
          console.log(this.state)
      })
      .catch (err => {
        alert(err)
      })
  }

  power_on_off() {
    var request = require('superagent');
    request
      .post('http://127.0.0.1:8000/api/user/setmode/')
      .send({"room_id": this.state.room_id, 
            "ac_status": this.state.is_on ? "off" : this.wind_int2str(this.state.ac_wind), 
            "target_temp": Number(this.state.ac_temp).toFixed(1)})
      .then(res => {
        this.parse_res(res);
        let is_on = !this.state.is_on;
        this.setState({
          is_on: is_on
        })
        console.log(this.state)
      })
      .catch (err => {
        alert(err)
      })
  }

  set_ac_mode(wind, temp){
    var request = require('superagent')
    request
      .post('http://127.0.0.1:8000/api/user/setmode/')
      .send({"room_id": this.state.room_id, 
            "ac_status": wind,
            "target_temp": Number(temp).toFixed(1)})
      .then(res => {
        this.stop_order_timer();
        console.log(this.state)
      })
      .catch (err => {
        alert(err)
      })
  }

  set_temp(temp) {
    if (temp < this.state.temp_min || temp > this.state.temp_max) {
      alert('Out of temp range!');
      return;
    }
    this.setState({
      ac_temp: Number(temp).toFixed(1)
    })
    this.stop_order_timer();
    this.start_order_timer(this.wind_int2str(this.state.ac_wind), temp);
  }

  set_wind(wind) {
    if (wind <= 0 || wind > 3) {
      alert('Out of wind range!');
      return;
    }
    let wind_type = this.wind_int2str(wind);
    this.setState({
      ac_wind: wind
    })
    this.set_ac_mode(wind_type, this.state.ac_temp);
  }

  render() {
    return (
      <div className="App">
          <div id="wrapper">
              <header id="header">
                {
                  this.state.is_checked_in ?
                    (<button className="logo" onClick={() => this.power_on_off()}>
                    <span className={"fa fa-power-off fa-2x " + (this.state.is_on ? "icon-ac-is-on" : "icon-ac-is-off")}></span>
                    </button>)
                    :
                    (<div className="logo"><span className="icon fa-gem"></span></div>)
                }
                
                <div className="content">
                  <div className="inner">
                    <h3>Welcome to 19D Hotel</h3>
                    <p>Enjoy your visit!</p>
                    {
                      this.state.is_checked_in ?
                        <div>
                          {this.state.is_on ? 
                          <div>
                            <div className="attr-box">
                              <button className="vertical-middle fa fa-minus" onClick={() => this.set_temp(Number(this.state.ac_temp) - 1)}></button>
                              <span className="vertical-middle text-label">
                                <i style={{"marginRight": 10}} className={this.state.ac_mode === 1 ? "fa fa-sun-o fa-spin" : (this.state.ac_mode === -1 ? "fa fa-snowflake-o fa-spin" : "fa fa-hand-peace-o")}></i>
                                {this.state.ac_temp} ℃
                              </span>
                              <button className="vertical-middle fa fa-plus" onClick={() => this.set_temp(Number(this.state.ac_temp) + 1)}></button>
                            </div>
                            <p></p>
                            <div className="attr-box">
                              <button className="vertical-middle fa fa-minus" onClick={() => this.set_wind(this.state.ac_wind - 1)}></button>
                              <span className="vertical-middle text-label">{this.wind_int2str(this.state.ac_wind).toUpperCase()} WIND</span>
                              <button className="vertical-middle fa fa-plus" onClick={() => this.set_wind(this.state.ac_wind + 1)}></button>
                            </div> 
                          </div> : <div></div>}
                          <p></p>
                          <article id="Detail">
                            <span className="image main"><img src="style/html5up-dimension/images/pic01.jpg" alt="" style={{height: 0 + 'px', width: 550 + 'px'}} /></span>
                            <h2 className="major">Detail</h2>
                            <h3>Room {this.state.room_id}</h3>
                            <h5>Now Temp: {Number(this.state.room_temp).toFixed(1)} ℃</h5>
                            <h5>Power Count: {this.state.power} kwh</h5>
                            <h5>Expense Count: {this.state.expense} $</h5>
                          </article>
                        </div>
                      :
                        <button onClick={() => this.check_in()}>CHECK IN</button>
                    }
                  </div>
                </div>
              </header>

              <footer id="footer">
                <p className="copyright">&copy; AC REMOTE CONTROL. Design: <a href="git@39.106.86.23:/home/git/air_conditioner_system_backend">19D</a>.</p>
              </footer>
          </div>
        {/*<!-- BG -->*/}
          <div id="bg"></div>
    </div>
    );
  }
}

export default App;
