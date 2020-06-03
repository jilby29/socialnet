const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { db } = require("./util/admin");

const { FBAuth } = require("./util/FBAuth");
const {
  getAllposts,
  createpost,
  getAPostAndItsComments,
  writeCommentForAPost,
  likeAPost,
  unlikeAPost,
  deleteAPost,
} = require("./handler/posts");
const {
  signup,
  login,
  upload,
  additionaldetails,
  getAllDetails,
  getAllUserRelateddetails,
  markNotificationRead,
} = require("./handler/user");

//Getting all posts
app.get("/getAllposts", getAllposts);
//Creating post
app.post("/createpost", FBAuth, createpost);

//upload images
app.post("/user/uploadImage", FBAuth, upload);
// additionaluerdetails
app.post("/user/additionalUserdetails", FBAuth, additionaldetails);

app.get("/user", FBAuth, getAllDetails);

//All details of a post
app.get("/post/:postId", getAPostAndItsComments);

//add a comment to a post
app.post("/post/:postId/comment", FBAuth, writeCommentForAPost);

//like a post
app.get("/post/:postid/like", FBAuth, likeAPost);

//unlike a post

app.get("/post/:postid/unlike", FBAuth, unlikeAPost);

//delete a post

app.delete("/post/:postid", FBAuth, deleteAPost);

//get user's all details

app.get("/user/:signupuser", getAllUserRelateddetails);
//signup route

app.post("/signup", signup);

//Login Route
app.post("/login", login);

app.post("/notification", FBAuth, markNotificationRead);

exports.api = functions.https.onRequest(app);

exports.notificationwhenliked = functions.firestore
  .document("/like/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/userposts/${snapshot.data().postid}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().signupuser
        ) {
          return db.doc(`/notification/${snapshot.id}`).set({
            recipent: doc.data().userHandle,
            sender: snapshot.data().signupuser,
            postid: doc.id,
            createdAt: new Date().toISOString(),
            read: false,
            type: "like",
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.deletenotificationWhenUnlike = functions.firestore
  .document("/like/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notification/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.notificationwhenComment = functions.firestore
  .document("/comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/userposts/${snapshot.data().postid}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().signupuser
        ) {
          return db.doc(`/notification/${snapshot.id}`).set({
            recipent: doc.data().userHandle,
            sender: snapshot.data().signupuser,
            postid: doc.id,
            createdAt: new Date().toISOString(),
            read: false,
            type: "comment",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.imagechange = functions.firestore
  .document("/signupuser/{id}")
  .onUpdate((snapshot) => {
    if (snapshot.before.data().ImageUrl !== snapshot.after.data().ImageUrl) {
      const batch = db.batch();
      return db
        .collection("userposts")
        .where("userHandle", "==", snapshot.before.data().signupuser)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/userposts/${doc.id}`);
            batch.update(post, {
              ImageUrl: snapshot.after.data().ImageUrl,
            });
          });
          return batch.commit();
        });
    }
  });

exports.deleteEverythingRelatedWithPost = functions.firestore
  .document("/userposts/{postid}")
  .onDelete((snapshot, context) => {
    const postid = context.params.postid;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("postid", "==", postid)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("like").where("postid", "==", postid).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/like/${doc.id}`));
        });
        return db
          .collection("notification")
          .where("postid", "==", postid)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notification/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.log(err));
  });
