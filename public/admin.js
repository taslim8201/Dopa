const $ = s => document.querySelector(s);

let videoUrl = "";
let thumbUrl = "";
let videoBusy = false;
let thumbBusy = false;

const savedCloud = localStorage.getItem("cloudName") || "";
const savedPreset = localStorage.getItem("uploadPreset") || "";

$("#cloudName").value = savedCloud;
$("#uploadPreset").value = savedPreset;

function saveConfig() {
  localStorage.setItem("cloudName", $("#cloudName").value.trim());
  localStorage.setItem("uploadPreset", $("#uploadPreset").value.trim());
}

function toggleSource() {
  const source = $("#videoSource").value;

  $("#cloudinaryBox").style.display =
    source === "cloudinary" ? "block" : "none";

  $("#youtubeBox").style.display =
    source === "youtube" ? "block" : "none";
}

$("#videoSource").onchange = toggleSource;

function getYouTubeId(url) {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "").split("/")[0];
    }

    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }

      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2];
      }

      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2];
      }
    }
  } catch {}

  return null;
}

function widget(resourceType, done) {
  saveConfig();

  const cloudName = $("#cloudName").value.trim();
  const uploadPreset = $("#uploadPreset").value.trim();

  if (!cloudName || !uploadPreset) {
    alert("Cloudinary Cloud Name and Unsigned Upload Preset are required.");
    return;
  }

  cloudinary.createUploadWidget(
    {
      cloudName,
      uploadPreset,
      sources: ["local"],
      multiple: false,
      resourceType,
      clientAllowedFormats:
        resourceType === "video"
          ? ["mp4", "webm", "mov", "m4v"]
          : ["jpg", "jpeg", "png", "webp"],
      maxVideoFileSize: 2147483648,
      maxChunkSize: 20000000,
      folder: "streambox",
      showAdvancedOptions: false,
      cropping: false,
      theme: "purple"
    },
    (error, result) => {
      if (error) {
        console.error(error);
        $("#status").textContent =
          error.message || "Upload failed.";
        return;
      }

      if (result.event === "upload-added") {
        $("#status").textContent = "Uploading…";
      }

      if (result.event === "success") {
        done(result.info.secure_url);
        $("#status").textContent = "Upload complete.";
      }
    }
  ).open();
}

$("#videoBtn").onclick = () =>
  widget("video", url => {
    videoUrl = url;
    videoBusy = false;
    $("#videoStatus").textContent = "✓ Uploaded";
  });

$("#thumbBtn").onclick = () =>
  widget("image", url => {
    thumbUrl = url;
    thumbBusy = false;
    $("#thumbStatus").textContent = "✓ Uploaded";
  });

$("#publishBtn").onclick = async () => {
  saveConfig();

  const password = $("#password").value.trim();

  if (!password) {
    alert("Enter admin password.");
    return;
  }

  const source = $("#videoSource").value;

  let finalVideoUrl = "";
  let finalThumbUrl = "";
  let videoType = source;

  if (source === "cloudinary") {
    if (!videoUrl) {
      alert("Upload the video first.");
      return;
    }

    finalVideoUrl = videoUrl;
    finalThumbUrl = thumbUrl;
  }

  if (source === "youtube") {
    const youtubeUrl = $("#youtubeUrl").value.trim();

    if (!youtubeUrl) {
      alert("Enter YouTube video URL.");
      return;
    }

    const videoId = getYouTubeId(youtubeUrl);

    if (!videoId) {
      alert("Invalid YouTube video URL.");
      return;
    }

    finalVideoUrl =
      "https://www.youtube.com/embed/" + videoId;

    finalThumbUrl =
      "https://img.youtube.com/vi/" +
      videoId +
      "/hqdefault.jpg";
  }

  const payload = {
    title:
      $("#titleInput").value.trim() ||
      "Untitled Episode",

    season:
      Number($("#seasonInput").value) || 1,

    episode:
      Number($("#episodeInput").value) || 1,

    duration:
      $("#durationInput").value.trim(),

    description:
      $("#descriptionInput").value.trim(),

    videoUrl: finalVideoUrl,

    thumbnailUrl: finalThumbUrl,

    videoType: videoType
  };

  $("#status").textContent =
    "Publishing episode…";

  try {
    const r = await fetch("/api/episodes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-password": password
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      $("#status").textContent =
        data.error || "Publish failed.";
      return;
    }

    $("#status").textContent =
      "Published successfully.";

    videoUrl = "";
    thumbUrl = "";

    $("#videoStatus").textContent =
      "Not selected";

    $("#thumbStatus").textContent =
      "Not selected";

    $("#youtubeUrl").value = "";
    $("#titleInput").value = "";
    $("#durationInput").value = "";
    $("#descriptionInput").value = "";

    load();

  } catch (err) {
    console.error(err);
    $("#status").textContent =
      "Network error. Please try again.";
  }
};

async function load() {
  try {
    const r = await fetch("/api/episodes");
    const items = await r.json();

    $("#adminGrid").innerHTML =
      items.length
        ? items
            .map(
              e => `
        <div class="admin-row">
          <div>
            <strong>${esc(e.title)}</strong>
            <span>
              Season ${e.season} · Episode ${e.episode}
            </span>
          </div>

          <button
            class="danger"
            data-id="${e.id}"
          >
            Remove
          </button>
        </div>
      `
            )
            .join("")
        : '<p class="meta">No episodes yet.</p>';

    document
      .querySelectorAll(".danger")
      .forEach(button => {
        button.onclick = async () => {
          if (
            !confirm(
              "Remove this episode from the website?"
            )
          ) {
            return;
          }

          const password =
            $("#password").value.trim();

          const r = await fetch(
            "/api/episodes?id=" +
              encodeURIComponent(button.dataset.id),
            {
              method: "DELETE",
              headers: {
                "x-admin-password": password
              }
            }
          );

          if (!r.ok) {
            const d = await r.json();
            alert(d.error || "Delete failed.");
            return;
          }

          load();
        };
      });
  } catch (err) {
    console.error(err);
  }
}

function esc(v = "") {
  return String(v).replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
  );
}

toggleSource();
load();
