from channels.generic.websocket import AsyncWebsocketConsumer
import json
class videochat(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name="test"
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self,close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
    async def receive(self,text_data):
        data=json.loads(text_data)
        print(data)
        if(data['action']=='new-offer' or data['action']=='new-answer'):
            channel=data['etc']['channel']
            data['etc']['channel']=self.channel_name
            await self.channel_layer.send(
                channel,
                {
                'type':"send.sdp",
                'data':data
                }        
            )
            return
        data['etc']['channel']=self.channel_name
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type':"send.sdp",
                'data':data
            }
        )
    async def send_sdp(self,event):
        print("in_send")
        await self.send(json.dumps(event['data']))