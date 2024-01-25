import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import LikedSongsPage from "./LikedSongsPage";
import CollectionPage from "./CollectionPage";

import "../css/randomPage.css";

import "../css/gridLayout.css";

const CLIENT_ID = "2c8d20f72c914fe79dfd499fb8f9644e";
const CLIENT_SECRET = "9ba9d68e457a43aea82a41d0114e9aa8";

function RandomMusicPage() {
  const [accessToken, setAccessToken] = useState("");
  const [albums, setAlbums] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [styleSelected, setStyleSelected] = useState("column");

  const username = localStorage.getItem("username");
  const [collectionValues, setCollectionValues] = useState([]);
  const [isDisable, setIsDisable] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [comments, setComments] = useState([]);

  useEffect(() => {
    var authParameters = {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body:
        "grant_type=client_credentials&client_id=" +
        CLIENT_ID +
        "&client_secret=" +
        CLIENT_SECRET,
    };
    fetch("https://accounts.spotify.com/api/token", authParameters)
      .then((result) => result.json())
      .then((data) => setAccessToken(data.access_token));

    const collectionValues = async () => {
      const response = await fetch(
        "http://localhost:8080/collections/" + username,
        {
          method: "get",
          headers: { "Content-Type": "application/json" },
        }
      );

      const collectionData = await response.json();
      setCollectionValues(collectionData);
      console.log(collectionData);
    };
    collectionValues();
  }, []);

  async function search() {
    var newAlbums = await fetch(
      "https://api.spotify.com/v1/browse/new-releases",
      {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }
    )
      .then((response) => response.json())
      .then((data) =>
        setAlbums(
          data.albums.items.map((album) => ({ ...album, liked: false }))
        )
      );
  }

  const handleAddToLikedSongs = async (selectedAlbum) => {
    const requestBody = {
      albumName: selectedAlbum.name,
      artist: selectedAlbum.artists[0].name,
      username: username,
      // const handleAddToLikedSongs = async (selectedAlbum) => {
      //   const requestBody = {
      //     //username: username,
      //     albumName: selectedAlbum.name,
      //     artist: selectedAlbum.artists[0].name,
      // collectionName: selectedCollection || collectionValues[0].collectionName,
    };
    const response = await fetch("http://localhost:8080/api/liked-songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  };

  //set selected value in dropdown change
  const handleCollectionChange = (e) => {
    setSelectedCollection(e.target.value);
  };
  // add to collection post data into db.
  const handleAddToCollection = async (selectedAlbum) => {
    const requestBody = {
      username: username,
      albumName: selectedAlbum.name,
      artist: selectedAlbum.artists[0].name,
      collectionName: selectedCollection || collectionValues[0].collectionName,
    };
    const response = await fetch("http://localhost:8080/api/song", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    // Create timestamp for adding to collection
    await createTimestampWithDescription(
      `Added ${selectedAlbum.name} to album collection.`,
      username
    );

    // Add the selected album to the user's collection
    console.log("Added to collection:", selectedAlbum);
    // Clear the selected album
    setSelectedAlbum(null);
  };

  const createTimestampWithDescription = async (description, retUser) => {
    try {
      const response = await fetch("http://localhost:8080/stamps/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionDescription: description, // Include the description
          retUser: retUser, // Include retUser in the request body
          // Add other properties as needed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create timestamp");
      }

      const successMessage = await response.text();
      console.log(successMessage);

      //fetchStamps(); // Refresh the list after successful creation
    } catch (error) {
      console.error("Error creating timestamp:", error);
      // Handle the error appropriately, e.g., display an error message to the user
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const commentText = event.target.elements.commentText.value;
    const albumName = selectedAlbum; // adjust based on where album name is stored

    if (commentText.trim() === "") {
      // Display an error message if the comment is empty
      alert("Please enter a comment before submitting.");
      return; // Prevent further execution of the function
    }

    const commentObject = {
      commentText,
      albumName,
    };

    fetch("http://localhost:8080/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commentObject),
    })
      .then((response) => response.json())
      .then((data) => {
        // Update comments state to reflect the new comment
        setComments((prevComments) => [...prevComments, data]);

        // Clear the comment form
        event.target.elements.commentText.value = "";

        // Display a success message (optional)
        console.log("Comment created successfully!", data);
      })
      .catch((error) => {
        // Handle errors, e.g., display an error message
        console.error("Error creating comment:", error);
      });
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/comments"); // Adjust the endpoint if needed
      const commentsData = await response.json();
      setComments(commentsData);
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Handle errors appropriately, e.g., display an error message to the user
    }
  };

  const handleDeleteAll = async () => {
    try {
      // Send a DELETE request to the API endpoint that handles deleting all comments:
      const response = await fetch("http://localhost:8080/api/comments", {
        method: "DELETE",
      });

      if (response.ok) {
        // Clear the comments array to remove all comments from the UI:
        setComments([]);

        console.log("All comments deleted successfully!");
      } else {
        console.error("Error deleting comments:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteFirst = async () => {
    try {
      // Retrieve the ID of the comment at the first index:
      const commentId = comments.id[0];

      // Send a DELETE request to the API endpoint to delete the specific comment:
      const response = await fetch(
        `http://localhost:8080/api/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove the comment from the state:
        setComments((prevComments) => prevComments.slice(1));

        console.log("Comment deleted successfully!");
      } else {
        console.error("Error deleting comment:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="RandomMusicPage">
      <br />
      <br />
      <br />
      <br />
      <br />
      <form>
        <label for="style">Choose a style:</label>
        <select
          id="style"
          name="style"
          onChange={(event) => setStyleSelected(event.target.value)}
        >
          <option value="column">Column</option>
          <option value="grid">Grid</option>
        </select>
      </form>
      <div>
        <button className="RandomButton" type="button" onClick={search}>
          Search for popular new tracks!
        </button>
      </div>
      {styleSelected === "column" ? (
        <div>
          {albums.map((album, i) => (
            <div className="RandomCard" key={i}>
              <img
                src={album.images[0].url}
                alt="alt text"
                className="randomImg"
              />
              <div>
                <h4>
                  <b>{album.name}</b>
                </h4>
                <p>{album.artists[0].name}</p>
                <button onClick={() => handleAddToLikedSongs(album)}>
                  {album.liked ? "Unlike" : "Like"}
                </button>

                {/* <button onClick={() => handleAddToLikedSongs (i)}>
                  {album.liked ? "Unlike" : "Like"}
                </button> */}
                <form>
                  <label for="userCollections">Choose a collection:</label>

                  <select
                    name="collections"
                    id="collections"
                    onChange={handleCollectionChange}
                  >
                    {collectionValues.length > 0 &&
                      collectionValues.map((value) => (
                        <option key={value.id}>{value.collectionName}</option>
                      ))}
                    {!collectionValues.length === 0 && (
                      <option>No collection found</option>
                    )}
                  </select>
                  <br />
                  <input
                    type="button"
                    value="Submit"
                    onClick={() => handleAddToCollection(album)}
                  />
                </form>
                <br></br>
                <form id="commentForm" onSubmit={handleSubmit}>
                  <label for="commentText"></label>
                  <textarea id="commentText" name="commentText"></textarea>
                  <br></br>
                  <button type="submit">Submit Review</button>
                </form>
                <button onClick={handleDeleteAll}>Delete All Reviews</button>
                <table
                  className="comments-table"
                  style={{ border: "none", color: "black" }}
                >
                  <thead>
                    <tr>{/* <th></th> */}</tr>
                  </thead>
                  <tbody>
                    {comments.map((comment) => (
                      <tr key={comment.id}>
                        <td>{comment.commentText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="GridContainer">
          {albums.map((album, i) => (
            <div className="GridRandomCard" key={i}>
              <div className="row">
                <img
                  src={album.images[0].url}
                  alt="alt text"
                  className="GridRandomImg"
                />
                <div>
                  <h4>
                    <b>{album.name}</b>
                  </h4>
                  <p>{album.artists[0].name}</p>
                  <button onClick={() => handleAddToLikedSongs(album)}>
                    {album.liked ? "Unlike" : "Like"}
                  </button>
                  <form>
                    <label for="userCollections">Choose a collection:</label>

                    <select
                      name="collections"
                      id="collections"
                      onChange={handleCollectionChange}
                    >
                      {collectionValues.length > 0 &&
                        collectionValues.map((value) => (
                          <option key={value.id}>{value.collectionName}</option>
                        ))}
                      {!collectionValues.length === 0 && (
                        <option>No collection found</option>
                      )}
                    </select>
                    <br />
                    <input
                      type="button"
                      value="Submit"
                      onClick={() => handleAddToCollection(album)}
                    />
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        {/* Uncomment this link when you have a LikedSongsPage component */}
        {/* <Link to="/likedsongs">Go to Liked Songs</Link> */}
      </div>
      <Routes>
        <Route
          path="/likedsongs"
          element={<LikedSongsPage likedAlbums={likedAlbums} />}
        />
        {/* Pass onAddSong callback to CollectionPage */}
        <Route
          path="/collections"
          element={<CollectionPage onAddSong={handleAddToCollection} />}
        />
      </Routes>
    </div>
  );
}

export default RandomMusicPage;
