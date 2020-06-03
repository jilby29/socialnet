const { db, admin } = require("../util/admin");
const { config } = require("../util/config");

exports.getAllposts = (req, res) => {
  db.collection("userposts")
    .get()
    .then((data) => {
      let userposts = [];
      data.forEach((doc) => {
        userposts.push({
          postid: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          ImageUrl: doc.data().ImageUrl,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
        });
      });
      return res.json(userposts);
    })
    .catch((err) => {
      console.error(err);
    });
};

exports.createpost = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }
  const userpost = {
    body: req.body.body,
    userHandle: req.user.userHandle,
    createdAt: new Date().toISOString(),
    ImageUrl: req.user.ImageUrl,
    likeCount: 0,
    commentCount: 0,
  };
  db.collection("userposts")
    .add(userpost)
    .then((doc) => {
      const respost = userpost;
      respost.postid = doc.id;
      res.json(respost);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ body: "something went wrong" });
    });
};

exports.getAPostAndItsComments = (req, res) => {
  let postdetails = {};
  db.doc(`/userposts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post doesnot exists" });
      }
      postdetails = doc.data();
      postdetails.postid = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postid", "==", req.params.postId)
        .get();
    })
    .then((data) => {
      postdetails.comments = [];
      data.forEach((doc) => {
        postdetails.comments.push(doc.data());
      });
      return res.json(postdetails);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.writeCommentForAPost = (req, res) => {
  const newcomment = {
    body: req.body.body,
    postid: req.params.postId,
    signupuser: req.user.userHandle,
    createdAt: new Date().toISOString(),
    userImage: req.user.ImageUrl,
  };

  db.doc(`/userposts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ comment: "Post not exists" });
      }

      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newcomment);
    })

    .then(() => {
      return res.json(newcomment);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    });
};

//Like A Post..if post already liked throw error else like the post

exports.likeAPost = (req, res) => {
  const userpostdata = db.doc(`/userposts/${req.params.postid}`);

  const likedocument = db
    .collection("like")
    .where("postid", "==", req.params.postid)
    .where("signupuser", "==", req.user.userHandle)
    .limit(1);

  let postdata;

  userpostdata
    .get()
    .then((doc) => {
      if (doc.exists) {
        postdata = doc.data();
        postdata.postid = doc.id;

        return likedocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then((doc) => {
      if (doc.empty) {
        return db
          .collection("like")
          .add({
            postid: req.params.postid,
            signupuser: req.user.userHandle,
          })
          .then(() => {
            postdata.likeCount++;
            return userpostdata.update({ likeCount: postdata.likeCount });
          })
          .then(() => {
            return res.json(postdata);
          });
      } else {
        return res.status(400).json({ error: "Post already liked" });
      }
    })

    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong" });
    });
};

exports.unlikeAPost = (req, res) => {
  const userpostdocument = db.doc(`/userposts/${req.params.postid}`);

  const likedocument = db
    .collection("like")
    .where("postid", "==", req.params.postid)
    .where("signupuser", "==", req.user.userHandle)
    .limit(1);

  let postdata;

  userpostdocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        postdata = doc.data();
        postdata.postid = doc.id;

        return likedocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then((data) => {
      if (!data.empty) {
        return db
          .doc(`/like/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postdata.likeCount--;
            return userpostdocument.update({ likeCount: postdata.likeCount });
          })
          .then(() => {
            return res.json(postdata);
          });
      } else {
        return res.status(404).json({ error: "post not liked" });
      }
    })

    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.deleteAPost = (req, res) => {
  db.doc(`/userposts/${req.params.postid}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post doesn't exist",
        });
      }
      if (doc.data().userHandle !== req.user.userHandle) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      return db.doc(`/userposts/${req.params.postid}`).delete();
    })
    .then(() => {
      return res.status(200).json({ message: "Post deleted" });
    })

    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};
