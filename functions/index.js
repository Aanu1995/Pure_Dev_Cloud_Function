const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch")

const admin = require("firebase-admin");
admin.initializeApp();

const firestore = admin.firestore();
const ALGOLIA_APP_ID = "R0547NV5EC";
const ALGOLIA_ADMIN_KEY = "c2a39e95694ecca02f37ec7bdaa43d69";
const ALGOLIA_USERS_INDEX_NAME = "Users";

  /// This section is for Invitation Triggers

  // when invitation is created, the sender counter increments by 1 and the receiver counter increments by 1
  // Also, userId is saved to shows that they are already connected
  exports.incrementInvitationCounter = functions.firestore
  .document("/Invitations/{invitationId}")
  .onCreate(async (snap, context) => {
    try {
      const data = snap.data();
      const senderId = data['senderId'];
      const receiverId = data['receiverId'];
      
      // increments sender counterId and add to connectionId list
      const senderData = {
        "sentCounter": admin.firestore.FieldValue.increment(1),
        [`connections.${receiverId}`]: 0,
      };
      await firestore.collection("UsersExt").doc(senderId).update(senderData);

      // increments reciever counterId and add to connectionId list
      var receiverData = {
        "receivedCounter": admin.firestore.FieldValue.increment(1),
        [`connections.${senderId}`]: 1,
      };
      await firestore.collection("UsersExt").doc(receiverId).update(receiverData);
     
      return console.log(`Counter for invitation increased`);
    } catch (error) {
      return console.log(error);
    }
  });

  // creates connection on users connected
  exports.createConnections = functions.firestore
  .document("/Invitations/{invitationId}")
  .onUpdate(async (change, context) => {
    try {
      var afterData = change.after.data()
      const members = afterData['members'];
      members.sort();
      afterData['members'] = members;
     
      afterData["date"] = afterData["sentDate"];
      afterData["sentDate"] = null;
      const invitationId = context.params.invitationId;
      
      await firestore.collection("Connections").doc(invitationId).set(afterData);
      firestore.collection("Invitations").doc(invitationId).delete();
     
      return console.log(`Create Connections`);
    } catch (error) {
      return console.log(error);
    }
  });

   // when invitation is delete, the sender counter decrements by 1 and the receiver counter decrements by 1
  exports.decrementInvitationCounter = functions.firestore
  .document("/Invitations/{invitationId}")
  .onDelete(async (snap, context) => {
    try {
      const data = snap.data();
      if(data["isAccepted"] == false){
        const senderId = data['senderId'];
        const receiverId = data['receiverId'];
        
        // decrements sender counterId and add to connectionId list
        const senderData = {
          "sentCounter": admin.firestore.FieldValue.increment(-1),
          [`connections.${receiverId}`]: admin.firestore.FieldValue.delete(),
        };
        await firestore.collection("UsersExt").doc(senderId).update(senderData);

        // decrements reciever counterId and add to connectionId list
        var receiverData = {
          "receivedCounter": admin.firestore.FieldValue.increment(-1),
          [`connections.${senderId}`]: admin.firestore.FieldValue.delete(),
        };
        await firestore.collection("UsersExt").doc(receiverId).update(receiverData);
        }
      
       return console.log(`Counter for invitation decreased`);
    } catch (error) {
      return console.log(error);
    }
  });


  ///  This section is for Connection Triggers

  // It increases the counter for connection once connections is created 
  exports.incrementConnectionCounter = functions.firestore
  .document("/Connections/{connectionId}")
  .onCreate(async (snap, context) => {
    try {
      const data = snap.data()
      
      const senderId = data['senderId'];
      const receiverId = data['receiverId'];
        
        // decrements sender counterId and add to connectionId list
        const senderData = {
          "sentCounter": admin.firestore.FieldValue.increment(-1),
          "connectionCounter": admin.firestore.FieldValue.increment(1),
          [`connections.${receiverId}`]: 2,
        };
        await firestore.collection("UsersExt").doc(senderId).update(senderData);

        // decrements reciever counterId and add to connectionId list
        var receiverData = {
          "receivedCounter": admin.firestore.FieldValue.increment(-1),
          "connectionCounter": admin.firestore.FieldValue.increment(1),
          [`connections.${senderId}`]: 2,
        };
        await firestore.collection("UsersExt").doc(receiverId).update(receiverData);
     
      return console.log(`Counter for invitation increased`);
    } catch (error) {
      return console.log(error);
    }
  });

  // remove connections
  exports.removeConnection = functions.firestore
  .document("/Connections/{connectionId}")
  .onDelete(async (snap, context) => {
    try {
      const data = snap.data()
      const connectionId = context.params.connectionId;
      
      const senderId = data['senderId'];
      const receiverId = data['receiverId'];
        
        // decrements connection counter
        const senderData = {
          "connectionCounter": admin.firestore.FieldValue.increment(-1),
          [`connections.${receiverId}`]:admin.firestore.FieldValue.delete(),
          [`connections.${senderId}`]:admin.firestore.FieldValue.delete(),
        };
        await firestore.collection("UsersExt").doc(senderId).update(senderData);

        // decrements connection counter
        var receiverData = {
          "connectionCounter": admin.firestore.FieldValue.increment(-1),
          [`connections.${senderId}`]: admin.firestore.FieldValue.delete(),
          [`connections.${receiverId}`]:admin.firestore.FieldValue.delete(),
        };
        await firestore.collection("UsersExt").doc(receiverId).update(receiverData);

        await firestore.collection("Chats").doc(connectionId).delete();
     
      return console.log(`Counter for invitation increased`);
    } catch (error) {
      return console.log(error);
    }
  });

  // Create Invitation on Invite Link used
  exports.createInvitation = functions.firestore
  .document("/InvitationLinks/{invitationId}")
  .onUpdate(async (change, context) => {
    try {
      const data = change.after.data();
      const invitationId = context.params.invitationId;
      await firestore.collection("Invitations").doc(invitationId).set(data);

      await firestore.collection("InvitationLinks").doc(invitationId).delete();

       return console.log(`Failed to create invitation`);
    } catch (error) {
      return console.log(error);
    }
  });

  
  
// This function copy user presence data from the real time data to the cloud firestore database

exports.onUserPresenceChange = functions.database
  .ref("Users/{userId}")
  .onUpdate(async (snap, context) => {
    try {
       // Get the data written to Realtime Database
      const data = snap.after.val();
      const userId = context.params.userId;

       // Get a reference to the Firestore document
      await firestore.collection("UsersExt").doc(userId).update(data);

       return console.log(`Updated user presence`);
    } catch (error) {
      return console.log(error);
    }
  });




// The functions below are used to execute stuff related to Algolia
// ###########################################################################################
// ###########################################################################################

  /// Users
exports.createUser = functions.firestore
.document('Users/{userId}')
.onCreate( async (snap, context) => {
   try{
      const newValue = snap.data();
      newValue.objectID = snap.id;
      const userId = context.params.userId;

      const data = {
        "receivedCounter": 0,
        "sentCounter": 0,
        "connectionCounter": 0,
        "connections": {},
      };
      await firestore.collection("UsersExt").doc(userId).set(data);
    
      var client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

      var index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
      index.saveObject(newValue);
      console.log("New User added to Algolia database");


   } catch(error){
      return console.log(error);
   }
});

exports.updateUser = functions.firestore
.document('Users/{userId}')
.onUpdate( async (snap, context) => {
    try{
      const afterUpdate = snap.after.data();
      afterUpdate.objectID =  snap.after.id;

      var client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
      
      var index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
      index.saveObject(afterUpdate);
      console.log("User updated in Algolia database");
    }catch(error){
      return console.log(error);
    }
});

exports.deleteUser = functions.firestore
.document('Users/{userId}')
.onDelete( async (snap, context) => {
    try{
      const oldID = snap.id;
      var client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

      var index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
      index.deleteObject(oldID);
      console.log("User deleted in Algolia database");
    } catch(error){
      return console.log(error);
    }
});

// Chat Functions
// ###########################################################################################
// ###########################################################################################

// Copy one-to-one data from connections to chats
exports.createChat = functions.firestore
  .document("/Chats/{chatId}")
  .onCreate(async (snap, context) => {
    try {
      
      const chatId = context.params.chatId;
      const result = snap.data();
      if(result["chatId"] == null){
        const doc = await firestore.collection("Connections").doc(chatId).get();
        const connData = doc.data();

        const data = {
          'chatId':chatId,
          'type':'one-to-one',
          'creationDate': connData["date"],
          'members': connData["members"],
        }
        await firestore.collection("Chats").doc(chatId).update(data);

        const members = connData["members"];
        var date = new Date().toISOString();
        const senderId = result["senderId"];
        // remove the sender from the members
        var myIndex = members.indexOf(senderId);
        members.splice(myIndex, 1);
        
        // update receipts
        var receiptData = {};
        for (const id of members){
          receiptData[`${id}`] = {"unreadCount": 1, "lastSeen": date};
        }
        // update the sender last seen
        const updateDate = result["updateDate"];
        receiptData[`${senderId}`] = {"unreadCount": 0, "lastSeen":  updateDate};
        await firestore.collection("Receipts").doc(chatId).set(receiptData);
       
      } else {
        const members = result["members"];
        var date = new Date().toISOString();
        var receiptData = {};
        for (const id of members){
          receiptData[`${id}`] = {"unreadCount": 0, "lastSeen": date};
        }
        await firestore.collection("Receipts").doc(chatId).set(receiptData);
      }

        return console.log(`One-to-One Chat updated ${chatId} updated successfully`);
    } catch (error) {
      return console.log(error);
    }
  });

  // Copy each messages data to the chat in order to update last message
  exports.updateChat = functions.firestore
  .document("/Chats/{chatId}/Messages/{messageId}")
  .onCreate(async (snap, context) => {
    try {
      
      const chatId = context.params.chatId;
      const message = snap.data();
      const senderId = message["senderId"];

      const doc = await firestore.collection("Chats").doc(chatId).get();
      const chatData = doc.data();

      // update chat for latest message
      const data = {
        'lastMessage': message["text"],
        'senderId': message['senderId'],
        'updateDate': message["sentDate"],
      }

      firestore.collection("Chats").doc(chatId).set(data, {merge: true });

      if(chatData["members"] != null){
        const members = chatData["members"];
        // remove the sender from the members
        var myIndex = members.indexOf(senderId);
        members.splice(myIndex, 1);
        
        // update receipts
        var receiptData = {};
        for (const id of members){
          receiptData[`${id}.unreadCount`] = admin.firestore.FieldValue.increment(1);
        }
        // update the sender last seen
        receiptData[`${senderId}.lastSeen`] = message["sentDate"];
        await firestore.collection("Receipts").doc(chatId).update(receiptData);
      }
       

       var chatMsg = message["text"] == ""? "Attachments": message["text"];
       const userDoc = await firestore.collection("Users").doc(senderId).get();
        var userData = userDoc.data();
        var fullName = userData["firstName"] + " " + userData["lastName"];

       if(chatData["type"] == "group"){
         var groupName = chatData["groupName"];
         var newChatMsg = fullName + ": " + chatMsg;
        sendNotification(chatId, groupName, newChatMsg)
       } else {
        sendNotification(chatId, fullName, chatMsg)
       }
       
      return console.log(`messages ${chatId} updated successfully`);
    } catch (error) {
      return console.log(error);
    }
  });

  function sendNotification(topic, title,  message){
    var payload = {
      data: {
        type: "message",
      },
      notification: {
        title: title,
        body: message
      }, 
      android:{
        priority: "high",
      },
      apns:{
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
        headers:{
          "apns-priority": "5",
        }
      },
      topic: topic
  };

  admin.messaging().send(payload);
  }