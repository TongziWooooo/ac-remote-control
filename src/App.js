import React from 'react';
import './App.css';
import './style/html5up-dimension/assets/css/fontawesome-all.min.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Slide } from 'react-toastify';

const ipaddr = 'http://39.106.86.23:8000'   // 后端服务器地址
const default_setting = {
  interval_heartbeat: 5000,         // 发送心跳包的频率
  interval_update_room_temp: 5000,  // 进行室内温度更新的频率
  is_checked_in: false,             // 是否已经入住
  is_on: false,                     // 空调是否已经开启
  is_served: false,                 // 是否正在送风
  room_id: "000",                   // 空调（房间）编号
  room_temp: 0.0,                   // 房间温度
  default_room_temp: 0.0,           // 默认房间温度
  default_ac_temp: 25,              // 默认空调温度
  ac_mode: 0,                       // 制热/制冷
  ac_wind: 2,                       // 风速
  ac_actual_wind: 0,                // 此时实际被送的风速
  ac_temp: 25,                      // 设定的空调温度
  temp_min: 0,                      // 空调温度范围
  temp_max: 40,
  online_time: 0,                   // 在线时间，属于后端处理数据，下同
  checkin_time: "",                 // 入住时间
  power: 0,                         // 已使用电量
  expense: 0,                       // 已花费钱数
  charge_policy: 0,                 // 每度电花费
  is_offline: false                 // 是否处于离线状态
}
class App extends React.Component {
  constructor(props){
    super(props);
    this.state = default_setting;
  }

  wind_int2str(wind) {    // 将前端的数字类型风速转换为后端字符串类型
    switch (wind) {
      case 1: 
        return "low";
      case 2: 
        return "medium";
      case 3: 
        return "high";
      default:
        toast.info('🦄 Out of wind range!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
        return -1;
    }
  }

  wind_str2int(wind) {    // 将后端的字符串类型风速转换为前端数字类型
    switch (wind) {
      case "low": 
        return 1;
      case "medium": 
        return 2;
      case "high": 
        return 3;
      default:
        toast.info('🦄 Out of wind range!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
        return -1;
    }
  }

  test_error(res) {     // 测试返回内容中是否有报错字段
    let json = JSON.parse(res.text);
    if (json.hasOwnProperty('Error')) {
      toast.error('❌ ' + json['Error'], {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        });
      return -1;
    }
    else{
      return 0;
    }
  }

  parse_res(res) {      // 通用的数据返回解析函数
    let json = JSON.parse(res.text);
    let is_checked_in = json['checked'];
    if (!is_checked_in) {   // 若此时已经checkout，需要暂停heartbeat的定时调用
      this.set_checkout();
      return;
    }
    let room_id = json['room_id'];
    let ac_status = json['ac_status'];
    let ac_actual_wind = this.state.ac_wind;
    let is_served = this.state.is_served;
    if (ac_status !== 'off') {  // 若风速不是0，说明正在送风
      is_served = true;
      ac_actual_wind = this.wind_str2int(ac_status);
    }
    else {  // 没有送风
      is_served = false;
    }
    let power = json['elec'];
    let online_time = json['online_time'];
    let checkin_time = json['checkin_time'];
    let expense = json['total_money'];
    let charge_policy = json['price'];
    this.setState({
      is_checked_in: is_checked_in,
      is_served: is_served,
      room_id: room_id,
      ac_actual_wind: ac_actual_wind,
      online_time: online_time,
      checkin_time: checkin_time,
      power: power,
      expense: expense,
      charge_policy: charge_policy
    });   
  }

  set_checkout() {
    this.interval_heartbeat && clearInterval(this.interval_heartbeat);
    toast.info('🦄 You have already checked out. The system will soon exit.', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      });
    this.setState(default_setting);
  }
  
  componentWillUnmount() {          // 页面卸载时将计时器清除
    this.interval_heartbeat && clearInterval(this.interval_heartbeat);
  }

  start_order_timer(wind, temp) {   // 开始本次调温指令的1s计时
    this.interval_order = setInterval(() => this.set_ac_mode(wind, temp), 1000);
  }

  stop_order_timer() {              // 结束本次计时
    this.interval_order && clearInterval(this.interval_order);
  }

  update_ac_mode(ac_temp) {         // 更新制冷/制热模式
    let ac_mode = 0;
    ac_mode = ac_temp > 25 ? 1 : 0;
    this.setState({
      ac_mode: ac_mode
    })
    //console.log("ac_temp: " + ac_temp + " ac_mode: " + ac_mode)
  }

  update_room_temp() {              // 更新房间实时温度
    let room_temp = this.state.room_temp;
    let int = this.state.interval_update_room_temp;
    if (this.state.is_served) {     // 送风情况下
      if (Number(this.state.room_temp).toFixed(1) < this.state.ac_temp) {
        room_temp += (0.5 + (this.state.ac_actual_wind - 2)*0.2) / (60000 / int)
      } 
      else if (Number(this.state.room_temp).toFixed(1) > this.state.ac_temp){
        room_temp -= (0.5 + (this.state.ac_actual_wind - 2)*0.2) / (60000 / int)
      }
      this.update_ac_mode(this.state.ac_temp);
      this.setState({
        room_temp: room_temp,
      })
      console.log(this.state.room_temp)
    }
    else {                          // 没有送风，恢复到默认温度
      if (Number(this.state.room_temp).toFixed(1) < this.state.default_room_temp) {
        room_temp += 0.5 / (60000 / int)
      } 
      else if (Number(this.state.room_temp).toFixed(1) > this.state.default_room_temp) {
        room_temp -= 0.5 / (60000 / int)
      }
      this.setState({
        room_temp: room_temp,
      })
      console.log(this.state.room_temp)
    }
  }

  heartbeat() {   // 心跳包，监测服务器情况，同时更新环境温度到数据库
    this.update_room_temp();
    var request = require('superagent');
    request
      .post(ipaddr + '/api/user/heartbeat/')
      .send({"room_id": this.state.room_id, 
            "temp": Number(this.state.room_temp).toFixed(1)})
      .then(res => {
        if (this.test_error(res) === 0) {
          this.parse_res(res);
        if (this.state.is_offline) {
          this.setState({is_offline: false});
          toast("🦄 You have reconnected to us!");
        }
        }
      })
      .catch (err => {
        this.setState({is_offline: true});
        toast.warn('😅 Looks like there is something wrong with the network. Trying to get connection... ', {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
      });
  }

  check_in() {    // 入住酒店，将分配房号和部分初值
    var request = require('superagent');
    request
      .get(ipaddr + '/api/user/checkin/')
      .then(res => {
        if (this.test_error(res) === 0)
        {
          this.parse_res(res);
          let json = JSON.parse(res.text);
          let temp_min = Number(json['temp_min']);
          let temp_max = Number(json['temp_max']);
          let room_temp = Number(json['temp']);
          let ac_temp = Number(json['target_temp']);
          this.update_ac_mode(ac_temp);
          let default_room_temp = room_temp;
          let default_ac_temp = ac_temp;
          this.setState({
            temp_min: temp_min,
            temp_max: temp_max,
            room_temp: room_temp,
            ac_temp: ac_temp,
            default_room_temp: default_room_temp,
            default_ac_temp: default_ac_temp
            }); 
            this.interval_heartbeat = setInterval(() => this.heartbeat(), this.state.interval_heartbeat);
            toast.success('👏 Successfully checked in!', {
              position: "top-right",
              autoClose: 2000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              });
        }
          console.log(this.state);
      })
      .catch (err => {
        toast.error('❌ ' + err, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
      })
  }

  power_on_off() {    // 开机/关机
    let default_ac_wind = 2;
    let default_ac_temp = this.state.default_ac_temp;
    var request = require('superagent');
    request
      .post(ipaddr + '/api/user/setmode/')
      .send({"room_id": this.state.room_id, 
            "ac_status": this.state.is_on ? "off" : this.wind_int2str(default_ac_wind), 
            "target_temp": Number(default_ac_temp).toFixed(1)})
      .then(res => {
        if (this.test_error(res) === 0) {
          this.parse_res(res);
          let is_on = !this.state.is_on;
          this.setState({
            is_on: is_on,
            ac_wind: default_ac_wind,
            ac_temp: default_ac_temp
          });
        }
        console.log(this.state);
      })
      .catch (err => {
        toast.error('❌ ' + err, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
      })
  }

  set_ac_mode(wind, temp){  // 设置空调风速或温度
    var request = require('superagent')
    request
      .post(ipaddr + '/api/user/setmode/')
      .send({"room_id": this.state.room_id, 
            "ac_status": wind,
            "target_temp": Number(temp).toFixed(0)})
      .then(res => {
        this.stop_order_timer();
        this.test_error(res);
        console.log(this.state)
        toast.success('👏 Successfully set!', {
          position: "top-right",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
      })
      .catch (err => {
        toast.error('❌ ' + err, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          });
      })
  }

  set_temp(temp) {    // 设置空调温度
    if (temp < this.state.temp_min || temp > this.state.temp_max) {
      toast.info('🦄 Out of temp range!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        });
      return;
    }
    this.setState({
      ac_temp: Number(temp).toFixed(1)
    })
    this.update_ac_mode(temp);
    this.stop_order_timer();
    this.start_order_timer(this.wind_int2str(this.state.ac_wind), temp);
  }

  set_wind(wind) {    // 设置空调风速
    if (wind <= 0 || wind > 3) {
      toast.info('🦄 Out of wind range!!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        });
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
          <ToastContainer transition={Slide}/>
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
                                <i className={"icon-text " + (this.state.ac_mode === 1 ? "fa fa-sun-o" : "fa fa-snowflake-o") + (this.state.is_served ? " fa-spin " : "")}></i>
                                {Number(this.state.ac_temp).toFixed(0)} ℃
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
                            <h5><i className={"icon-text fa fa-thermometer-half"}></i><span className={"detail-label-box"}>Temp</span><span className={"detail-text-box"}>{Number(this.state.room_temp).toFixed(1)} ℃</span></h5>
                            <h5><i className={"icon-text fa fa-bolt"}></i><span className={"detail-label-box"}>Power</span><span className={"detail-text-box"}>{this.state.power} kwh</span></h5>
                            <h5><i className={"icon-text fa fa-dollar"}></i><span className={"detail-label-box"}>Expense</span><span className={"detail-text-box"}>{this.state.expense} $</span></h5>
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
