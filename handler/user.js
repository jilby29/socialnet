const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);
const { db, admin } = require("../util/admin");

const {
  validateSignupData,
  validateLoginData,
  validateadditionaldetails,
} = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    signupuser: req.body.signupuser,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noimg = "noimage.png";

  let tokenid, userid;
  db.doc(`/signupuser/${newUser.signupuser}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ general: "user already exists" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userid = data.user.uid;
      return data.user.getIdToken();
    })
    .then((token) => {
      tokenid = token;
      const userCredentials = {
        signupuser: newUser.signupuser,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        ImageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noimg}?alt=media`,
        userid,
      };
      db.doc(`/signupuser/${newUser.signupuser}`).set(userCredentials);
      return res.status(201).json({ token: tokenid });
    })
    .catch((error) => {
      console.log(error);
      if (error.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email already exists" });
      } else {
        return res.status(500).json({ message: error.code });
      }
    });
};

exports.login = (req, res) => {
  const logincCredentials = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(logincCredentials);

  if (!valid) return res.status(400).json(errors);
  let tokenid;
  firebase
    .auth()
    .signInWithEmailAndPassword(
      logincCredentials.email,
      logincCredentials.password
    )
    .then((doc) => {
      return doc.user.getIdToken();
    })
    .then((token) => {
      tokenid = token;
      return res.status(200).json({ token: tokenid });
    })
    .catch((error) => {
      console.log(error);

      return res
        .status(400)
        .json({ general: "Invalid Email/password..Try again!!" });
    });
};
// add additional user details like bio,location,website
exports.additionaldetails = (req, res) => {
  let extradetails = validateadditionaldetails(req.body);

  db.doc(`/signupuser/${req.user.userHandle}`)
    .update(extradetails)
    .then(() => {
      return res.json({ message: "additional details added" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//upload image
exports.upload = (req, res) => {
  const os = require("os");
  const fs = require("fs");
  const path = require("path");
  const Busboy = require("busboy");

  //Initialize Busboy
  const busboy = new Busboy({ headers: req.headers });
  let ImageFileName;
  let ImageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    ImageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`;

    const filepath = path.join(os.tmpdir(), ImageFileName);

    ImageToBeUploaded = { filepath, mimetype };

    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(ImageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: ImageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        // https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noimg}?alt=media
        const ImageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${ImageFileName}?alt=media`;
        return db
          .doc(`/signupuser/${req.user.userHandle}`)
          .update({ ImageUrl });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ message: "Image upload failed" });
      });
  });
  busboy.end(req.rawBody);
};
//get allueserdetailsincluding likes
exports.getAllDetails = (req, res) => {
  let useralldetails = {};
  db.doc(`/signupuser/${req.user.userHandle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        useralldetails.credentials = doc.data();
        return db
          .collection("likes")
          .where("signupuser", "==", req.user.userHandle)
          .get();
      }
    })
    .then((data) => {
      useralldetails.likes = [];
      data.forEach((doc) => {
        useralldetails.likes.push(doc.data());
      });
      return db
        .collection("notification")
        .where("recipent", "==", req.user.userHandle)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
    })
    .then((data) => {
      useralldetails.notifications = [];
      data.forEach((doc) => {
        useralldetails.notifications.push({
          recipent: doc.data().recipent,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          postid: doc.data().postid,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(useralldetails);
    })

    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//get any user's details
exports.getAllUserRelateddetails = (req, res) => {
  let alluserrelateddata = {};
  db.doc(`/signupuser/${req.params.signupuser}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        alluserrelateddata.user = doc.data();
        return db
          .collection("userposts")

          .where("userHandle", "==", req.params.signupuser)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User doesn't exists" });
      }
    })
    .then((data) => {
      alluserrelateddata.userposts = [];
      data.forEach((doc) => {
        alluserrelateddata.userposts.push({
          body: doc.data().body,
          commentCount: doc.data().commentCount,
          createdAt: doc.data().createdAt,
          likeCount: doc.data().likeCount,
          userHandle: doc.data().userHandle,
          ImageUrl: doc.data().ImageUrl,
          postid: doc.id,
        });
      });
      return res.json(alluserrelateddata);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.markNotificationRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notification/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notification marked read" });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(500)
        .json({ general: "Something went wrong please try again" });
    });
};
