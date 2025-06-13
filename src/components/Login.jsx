import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postRequest, uid } from "./utility/config";

const Login = () => {
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const localStorageKey = "kite-userToken";
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [tokenForm, setTokenForm] = useState(false);
  const [twofaForm, setTwofaForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState(true);
  const [userId, setUserId] = useState("");

  const apiUrl = "http://localhost:1234/api/login";

  const [otpVisibility, setOtpVisibility] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [reqId, setReqId] = useState("");

  useEffect(() => {
    if (reqId && reqId.length > 10) {
      setPasswordForm(false);
    }
  });
  
  useEffect(() => {
    if (!passwordForm) {
      setTwofaForm(true);
    }
  })

  useEffect(() => {
    const token = localStorage.getItem(localStorageKey);
    if (token) {
      console.log(checkTokenActive(token))
      try {
        if (checkTokenActive(token)) {
          navigate("/dashboard");
        } else {
          localStorage.removeItem(localStorageKey);
        }
      } catch (error) {
        localStorage.removeItem(localStorageKey);
      }
    }
  }, []);

  async function login(e) {
    e.preventDefault();

    if (userId.length === 6 && password.length === 10) {
      setLoading(true);
      const jData = {
        userId: userId,
        password: password,
      };

      try {
        await postRequest("login", jData).then((res) => {
          if (res && res.data && res.data.status && res.data.status === "success" && res.data.data && res.data.data.request_id) {
            setReqId(res.data.data.request_id);
          }
        });
      } catch (error) {
        console.error("Error during login:", error);
        if (error && error.code) alert("Error code: "+error.code);
      } finally {
        setLoading(false);
      }
    } else {
      alert("please enter the details properly");
    }
  }

  async function sha256(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  const showTokenForm = () => {
    setTokenForm(true);
    setPasswordForm(false);
  };

  const closeTokenForm = () => {
    setTokenForm(false);
    setPasswordForm(true);
  };

  const signInByToken = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem(localStorageKey, token);
      setLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  const signInByTwofa = async (e) => {
    e.preventDefault();
    setLoading(true);
    const jData = {
      userId: userId,
      totp: totp,
      reqId: reqId,
    };

    try {
      await postRequest("twofa", jData).then((res) => {
        if (res && res.data && res.data.status === "success" && res.data.encToken) {
          var accessToken = res.data.encToken;
          localStorage.setItem(localStorageKey, accessToken+"==");
          navigate("/dashboard");
        } else {
          alert("Login failed. Please check your password.");
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkTokenActive = async () => {
    //postRequest();
    return false;
  };

  return (
    <div
      className="flex justify-center items-center h-screen"
      style={{ backgroundColor: "#161616" }}
    >
      <div>
        <form className="form">
          {loading && <div className="loader mb-4" />}
          {passwordForm && (
            <>
              <div className="flex-column">
                <label>User ID</label>
              </div>
              <div className="inputForm">
                <i
                  className="fa-solid fa-user"
                  style={{ color: "rgb(0 156 71)" }}
                ></i>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter user id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div className="flex-column">
                <label>Password</label>
              </div>
              <div className="inputForm">
                <i
                  className="fa-solid fa-key"
                  style={{ color: "rgb(0 156 71)" }}
                ></i>
                <input
                  className="input"
                  placeholder="Type password"
                  type={passwordVisibility ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {passwordVisibility ? (
                  <i
                    className="fa fa-eye"
                    style={{
                      position: "absolute",
                      right: "10px",
                      cursor: "pointer",
                      zIndex: 5,
                      color: "rgb(0 156 71)",
                    }}
                    onClick={() => setPasswordVisibility(!passwordVisibility)}
                  ></i>
                ) : (
                  <i
                    className="fa fa-eye-slash text-white"
                    style={{
                      position: "absolute",
                      right: "10px",
                      cursor: "pointer",
                      zIndex: 5,
                      color: "rgb(0 156 71)",
                    }}
                    onClick={() => setPasswordVisibility(!passwordVisibility)}
                  ></i>
                )}
              </div>

              <div className="flexRow flex-row">
                <div className="custom-radio">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="remember"
                    className="radio-input"
                  />
                  <label className="radio-label">Remember me</label>
                </div>
                <span className="span">Forgot password?</span>
              </div>
              <button
                className="button-submit hover:bg-blue-700 transition-all"
                onClick={login}
              >
                Sign In
              </button>
              <p className="p">
                Don't have an account?{" "}
                <a
                  className="text-blue-600"
                  href="https://sattya1997.github.io/stock-market/"
                >
                  Guest page
                </a>
              </p>
              <p className="p line">Or</p>

              <div className="flexRow flex-row">
                <a
                  href="https://www.linkedin.com/in/satyajitsarkar1997?trk=contact-info"
                  className="btn google"
                >
                  {" "}
                  See LinkedIn
                </a>
                <button className="btn apple" onClick={showTokenForm}>
                  Login by Token
                </button>
              </div>
            </>
          )}
          {tokenForm && (
            <>
              <div className="flex-column">
                <label>Token</label>
              </div>
              <div className="inputForm">
                <svg
                  height="20"
                  viewBox="-64 0 512 512"
                  width="20"
                  xmlns="http://www.w3.org/2000/svg"
                  color="rgb(0 156 71)"
                >
                  <path
                    d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"
                    fill="currentColor"
                  ></path>
                  <path
                    d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"
                    fill="currentColor"
                  ></path>
                </svg>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <button
                className="button-submit hover:bg-blue-700 transition-all"
                onClick={signInByToken}
              >
                Sign In
              </button>
              <p className="p">
                Don't have an account?{" "}
                <a
                  className="text-blue-600"
                  href="https://sattya1997.github.io/stock-market/"
                >
                  Guest page
                </a>
              </p>
              <p className="p line">Or</p>

              <div className="flexRow flex-row">
                <a
                  href="https://www.linkedin.com/in/satyajitsarkar1997?trk=contact-info"
                  className="btn google"
                >
                  {" "}
                  See LinkedIn
                </a>
                <button className="btn apple" onClick={closeTokenForm}>
                  Login by OTP
                </button>
              </div>
            </>
          )}

          {twofaForm && (
            <>
              <div className="flex-column">
                <label>TOTP</label>
              </div>
              <div className="inputForm">
                <i
                  className="fa-solid fa-mobile-retro fa-lg p-1"
                  style={{ color: "rgb(0 156 71)" }}
                ></i>
                <input
                  className="form-card-input"
                  placeholder="______"
                  maxLength="6"
                  type={otpVisibility ? "text" : "password"}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                />
                {otpVisibility ? (
                  <i
                    className="fa fa-eye"
                    style={{
                      position: "absolute",
                      right: "10px",
                      cursor: "pointer",
                      zIndex: 5,
                      color: "rgb(0 156 71)",
                    }}
                    onClick={() => setOtpVisibility(!otpVisibility)}
                  ></i>
                ) : (
                  <i
                    className="fa fa-eye-slash text-white"
                    style={{
                      position: "absolute",
                      right: "10px",
                      cursor: "pointer",
                      zIndex: 5,
                      color: "rgb(0 156 71)",
                    }}
                    onClick={() => setOtpVisibility(!otpVisibility)}
                  ></i>
                )}
              </div>
              <button
                className="button-submit hover:bg-blue-700 transition-all"
                onClick={signInByTwofa}
              >
                Sign In
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
