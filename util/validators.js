const isEmpty = (String) => {
  if (String.trim() == "") return true;
  else return false;
};
const isEmail = (email) => {
  const regex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
  if (email.match(regex)) return true;
  else return false;
};

exports.validateSignupData = (data) => {
  let errors = {};
  if (isEmpty(data.email)) {
    errors.email = "Email empty";
  }
  if (!isEmail(data.email)) {
    errors.email = "Enter valid email";
  }

  if (isEmpty(data.password)) {
    errors.password = "Email password";
  }

  if (isEmpty(data.signupuser)) {
    errors.signupuser = " user empty";
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Password must match";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};
  const isEmpty = (String) => {
    if (String.trim() == "") return true;
    else return false;
  };

  if (isEmpty(data.email)) {
    errors.email = "Email must not be empty";
  }

  if (isEmpty(data.password)) {
    errors.password = "password must not be empty";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateadditionaldetails = (data) => {
  let userdetails = {};
  if (!isEmpty(data.bio.trim())) userdetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userdetails.website = `http://${data.website.trim()}`;
    } else userdetails.website = data.website;
  }
  if (!isEmpty(data.location.trim())) userdetails.location = data.location;

  return userdetails;
};
