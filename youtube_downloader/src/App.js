import React, { useState } from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { experimentalStyled as styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Modal from "@mui/material/Modal";
import "./App.css";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  pt: 2,
  px: 4,
  pb: 3,
};

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#6791e4",
  ...theme.typography.body2,
  padding: theme.spacing(2),
  textAlign: "center",
  color: "#fff",
  ...theme.applyStyles("dark", {
    backgroundColor: "#1A2027",
  }),
}));

function App() {
  const [url, setUrl] = useState("");
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState({ f_id: "", f_res: "" });
  const [open, setOpen] = useState(false);
  const [openModal, setModal] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch available formats
  const fetchFormats = async () => {
    if (!url) return alert("Please enter a YouTube URL");
    setOpen(true);
    try {
      const response = await axios.get("http://localhost:5001/formats", {
        params: { url },
      });
      console.log("printing response...");
      console.log(response);
      setFormats(response.data.formats);
    } catch (error) {
      console.error("Error fetching formats:", error);
      alert("Failed to fetch formats.");
    }
    setOpen(false);
  };

  //Download video
  const downloadVideo = async () => {
    if (!selectedFormat.f_id) return alert("Please select a resolution!");
    setModal(false);
    setProgress(0); // Reset progress bar

    // Open WebSocket connection for progress updates
    const socket = new WebSocket("ws://localhost:5002");

    socket.onopen = () => {
      console.log("WebSocket Connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Progress Update:", data.progress); // Debugging
      setProgress(data.progress);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket Closed");
    };
    try {
      const response = await axios.post("http://localhost:5001/download", {
        url,
        format_id: selectedFormat.f_id,
      });
      if (response.data.file) {
        console.log("link -> " + response.data.file);
        // ✅ Auto-download the file
        const link = document.createElement("a");
        link.href = response.data.file;
        // link.setAttribute("download", "video.mp4"); // Optional: Set download filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => {
        socket.close();
      }, 2000);
    } catch (error) {
      console.error("Error downloading video:", error);
      alert("Download failed.");
    }
  };

  return (
    <Box>
      <div>
        <Box
          sx={{ marginTop: "90px", alignItems: "center", textAlign: "center" }}
        >
          <h1 className="heading">YouTube Video Downloader</h1>
          <p className="desc">
            Download any YouTube video of your choice in various resolution for
            absolutely free
          </p>
        </Box>
        <Grid
          container
          direction="row"
          sx={{
            justifyContent: "center",
            alignItems: "center",
            margin: "30px 5px",
          }}
        >
          <Box
            sx={{
              width: 500,
              maxWidth: "100%",
              alignItems: "center",
              alignContent: "center",
            }}
          >
            <TextField
              fullWidth
              // label="Enter YouTube URL"
              placeholder="Enter YouTube URL"
              id="fullWidth"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Box>
          <Box>
            <Button
              variant="contained"
              onClick={fetchFormats}
              sx={{ margin: "5px 2px" }}
              size="large"
              color="success"
            >
              Search
            </Button>
            <Backdrop
              sx={(theme) => ({
                color: "#fff",
                zIndex: theme.zIndex.drawer + 1,
              })}
              open={open}
            >
              <CircularProgress color="inherit" />
            </Backdrop>
          </Box>
        </Grid>
        {/* {formats.length > 0 && ( */}
        <Box
          sx={{
            flexGrow: 1,
            // width: "90%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            columns={{ xs: 8, sm: 4, md: 12 }}
            sx={{
              margin: "8px",
            }}
          >
            {formats.map((f, index) => (
              <Grid
                key={index}
                size={{ xs: 4, sm: 2, md: 3 }}
                sx={{
                  cursor: "pointer",
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 2,
                  transition: "all 0.3s",
                  ":hover": { background: "rgba(255, 255, 255, 0.4)" },
                  ":active": {
                    background: "rgba(255, 255, 255, 0.6)",
                    transform: "scale(0.9)",
                  },
                }}
                onClick={(e) => {
                  setSelectedFormat({ f_id: f.format_id, f_res: f.resolution });
                  setModal(true);
                  console.log(f.format_id + " " + f.resolution);
                }}
              >
                <Item>
                  {f.resolution}
                  <br /> ({f.file_size})
                </Item>
              </Grid>
            ))}
          </Grid>
          <Modal
            open={openModal}
            onClose={() => setModal(false)}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
          >
            <Box sx={{ ...style, width: 300 }}>
              <p id="parent-modal-description">
                Video will be downloaded in {selectedFormat.f_res}p<br />
                Please do not close the Browser Tab.
              </p>
              <Button variant="outlined" onClick={downloadVideo}>
                Download
              </Button>
            </Box>
          </Modal>
        </Box>

        <Box
          sx={{
            textAlign: "center",
            margin: "20px 5px",
          }}
        >
          {progress > 0 && (
            <div className="main_prog">
              <p className="warning">
                Preparing your video, Please do not close the Tab or Window
              </p>
              <div className="progress">{progress}%</div>
            </div>
          )}
        </Box>
      </div>
    </Box>
  );
}

export default App;
