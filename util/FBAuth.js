const { admin, db } = require("./admin");
exports.FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    return res.status(403).json({ message: "Not Authorized" });
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("signupuser")
        .where("userid", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.userHandle = data.docs[0].data().signupuser;
      req.user.ImageUrl = data.docs[0].data().ImageUrl;
      return next();
    })
    .catch((err) => {
      console.error("Error while verifying token: ", err);
      return res.status(403).json(err);
    });
};
