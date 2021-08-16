
let video=document.getElementById('video')
let video_container=document.getElementById('video-container')
let video_btn=document.getElementById('video-btn')
let audio_btn=document.getElementById('audio-btn')

let join_btn=document.getElementById('username-btn')
let username_input=document.getElementById('username')
let username=""
let peerconnections=[]
let localStream=new MediaStream()
let messagelist=document.getElementById('messages')
let message_btn=document.getElementById('message-toggle-btn')
let send_message_btn=document.getElementById('send-message-btn')
let message=document.getElementById('message-chat')
messagelist.scrollTop=messagelist.scrollHeight
/*let configuration ={
    'iceServers':[{"urls":"stun:stun.l.google.com:19302"},
        {"urls":"stun:stunserver.org"},
         {"urls":"stun:stun.xten.com"},
        {
        "urls": "turn:numb.viagenie.ca",
        "credential": "muazkh",
        "username": "webrtc@live.com"
        },
        {
        "urls": "turn:192.158.29.39:3478?transport=udp",
        "credential": "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        "username": "28224511:1379330808"
        },
        {
        "urls": "turn:192.158.29.39:3478?transport=tcp",
        "credential": "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        "username": "28224511:1379330808"
        }]
}*/
let configuration=null

//video 
navigator.mediaDevices.getUserMedia({'video':true,'audio':true}).then(stream=>{
    localStream=stream
    video.srcObject=localStream
    var audiotrack = stream.getAudioTracks()
    var videotrack = stream.getVideoTracks()
    video.muted=true
    audiotrack[0].enabled=true
    videotrack[0].enabled=true

    video_btn.addEventListener('click',e=>{
        videotrack[0].enabled=!videotrack[0].enabled
        if(videotrack[0].enabled==true)video_btn.innerHTML="Turn Video off"
        else video_btn.innerHTML="Turn Video On"
    })
    audio_btn.addEventListener('click',e=>{
        audiotrack[0].enabled=!audiotrack[0].enabled
        if(audiotrack[0].enabled==true)audio_btn.innerHTML="Turn audio off"
        else audio_btn.innerHTML="Turn audio On"
    })
})

//send signal
function send_signal(user_name,action,etc){
    data={
        'username':user_name,
        'action':action,
        'etc':etc
    }
    socket.send(JSON.stringify(data))
}

//add video for new peer
function add_video(user_name){
    new_video_div=document.createElement('div')
    new_video_div.classList.add("col-6")
    new_video=document.createElement('video')
    new_video.className="shadow-lg"
    new_video.autoplay=true
    new_video.id="video-"+user_name
    new_video.setAttribute("height","60%")
    new_video.setAttribute("width","80%")
    new_video_div.appendChild(new_video)
    video_container.appendChild(new_video_div)
    return new_video
}
//adds message
function AddMessage(text){
    console.log('in add message')
    message_new=document.createElement('li')
    message_new.innerText=text
    messagelist.appendChild(message_new)
}
//send message via WebRTC
function send_message(user_name,text){
    console.log("In send message")
    for(i in peerconnections)peerconnections[i][1].send(user_name+":"+text)
    
}
//send offer to specific channel
function sendoffer(data){
    var lc =new RTCPeerConnection(configuration)
    add_track(lc)
    var rc =lc.createDataChannel('channel')
    remote_video=add_video(data['username'])
    set_track(lc,remote_video)
    lc.createOffer().then(e=>lc.setLocalDescription(e))
    peerconnections[data['username']]=[lc,rc]
    lc.addEventListener('icecandidate',(e)=>{
        if(e.candidate)return
        send_signal(user_name=username,action="new-offer",
                    etc={'sdp':JSON.stringify(lc.localDescription),
                    'channel':data['etc']['channel']})
                })
    rc.addEventListener('message',e=>AddMessage(e.data))
    rc.addEventListener('open',e=>{
        console.log('connection opened')
    })
} 

//send Answer to all channels
function sendanswer(data){
    var lc = new RTCPeerConnection(configuration)
    add_track(lc)
    lc.ondatachannel=ev=>{
        console.log("Invoked")
        lc.rc=ev.channel
        lc.rc.addEventListener('message',e=>AddMessage(e.data))
        peerconnections[data['username']]=[lc,lc.rc]
    }
    remote_video=add_video(data['username'])
    set_track(lc, remote_video)
    console.log(data)
    lc.setRemoteDescription(JSON.parse(data['etc']['sdp']))
    .then(()=>{lc.createAnswer()
              .then(e=>lc.setLocalDescription(e))
            })
        lc.addEventListener('icecandidate',(e)=>
        {
            if(e.candidate)return
            send_signal(user_name=username,action="new-answer",
                    etc={'sdp':JSON.stringify(lc.localDescription),
                    'channel':data['etc']['channel']})
                })
}
    
//set answer sdp to local connection
function setanswer(data){
    console.log("setting")
    peerconnections[data['username']][0].setRemoteDescription(JSON.parse(data['etc']['sdp']))
}

//adding local tracks to peer connection

function add_track(peer){
    console.log("In addtrack")
    localStream.getTracks().forEach(track=>{
        peer.addTrack(track, localStream)
    })
}

//setting remote tracks to peer connection

function set_track(peer,remotevideo){
    console.log("In set track")
    let remote_stream=new MediaStream()
    peer.addEventListener('track',e=>{
        console.log('new track')
        e.streams[0].getTracks().forEach(track=>remote_stream.addTrack(track,remote_stream))
    })
    
    remotevideo.srcObject=remote_stream
    
}
username_input.addEventListener('keypress',e=>{
    if(e.keyCode==13)join_btn.click()
})
//Socket Handling
join_btn.addEventListener('click',e=>{
  username=username_input.value  
  join_btn.disabled=true
  join_btn.style.visibility="hidden"
  document.querySelector("#username-tag").style.visibility="hidden"
  username_input.disabled=true
   if(window.location.protocol=='http:')pro="ws://"
   else pro="wss://" 
  socket = new WebSocket(pro+window.location.host+"/ws/")

  socket.addEventListener('open',e=>{
      console.log("websocket connection opened")
      send_signal(user_name=username,action="new-peer",etc={})
  })
  socket.addEventListener('close',e=>{
    console.log("connection closed")
    })
  socket.addEventListener('error',e=>{
    console.log("connection error")
    })
  socket.addEventListener('message',e=>{
    data= JSON.parse(e.data)
    if(data['username']==username)return
    else if (data['action']=='new-peer'){
        console.log('new user added')
        sendoffer(data)
    }
    else if(data['action']=='new-offer'){
        console.log('new offer added')
        sendanswer(data)
    }
    else if(data['action']=='new-answer'){
        console.log('new answer added')
        console.log(JSON.parse(data['etc']['sdp']))
        setanswer(data)
    } 
    })  
})
//toggle messages
message_btn.addEventListener('click',e=>{
    if(messagelist.className=='collapse')messagelist.className='collapse-show'
    else messagelist.className='collapse'
})
//send messages
send_message_btn.addEventListener('click',e=>{
    message_text=message.value
    if (message_text=='')return
    message.value=""
    AddMessage(username+":"+message_text)
    send_message(username,message_text)
})