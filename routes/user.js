import express from "express";
import fs from "fs";
import csv from "csv-parser";

const couples = {
  Max: "Shelby",
  Shelby: "Max",
  Lauren: "Gab",
  Gab: "Lauren",
  Nic: "Meg",
  Meg: "Nic",
  Greg: "Tracey",
  Tracey: "Greg",
};

const getUsers = async () => {
  return new Promise((resolve, reject) => {
    const users = [];
    //Read the users from the csv file
    fs.createReadStream("data.csv")
      .pipe(csv())
      .on("data", (row) => {
        users.push(row);
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
        resolve(users);
      });
  });
};

const getMatches = async () => {
  return new Promise((resolve, reject) => {
    const matches = [];
    //Read the matches from the csv file
    fs.createReadStream("matches.csv")
      .pipe(csv())
      .on("data", (row) => {
        matches.push(row);
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
        resolve(matches);
      });
  });
};

const generateUniqueMatches = (users) => {
  if (users.length < 2) throw new Error("At least two users are required.");

  function createRound(users) {
    // Shuffle the array to randomize the order
    const shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pair each user with the next, wrapping at the end
    const pairs = [];
    for (let i = 0; i < shuffled.length; i++) {
      const user1 = shuffled[i];
      const user2 = shuffled[(i + 1) % shuffled.length];
      pairs.push([user1, user2]);
    }

    return pairs;
  }

  let round1, round2;
  let retryCount = 0;

  // Generate rounds until no pairs repeat
  do {
    console.log("Generating rounds...");
    if (retryCount++ > 100)
      throw new Error("Unable to find unique matches after multiple attempts.");

    round1 = createRound(users);
    round2 = createRound(users);
    const miaGetsLauren = round1.some(([u1, u2]) =>
      round2.some(
        ([v1, v2]) =>
          (u1 === "Mia" && u2 === "Lauren") || (v1 === "Mia" && v2 === "Lauren")
      )
    );
  } while (
    !round1.some(([u1, u2]) =>
      round2.some(
        ([v1, v2]) =>
          (u1 === "Mia" && u2 === "Lauren") || (v1 === "Mia" && v2 === "Lauren")
      )
    ) &&
    round1.some(([u1, u2]) =>
      round2.some(
        ([v1, v2]) => (u1 === v1 && u2 === v2) || (u1 === v2 && u2 === v1)
      )
    ) &&
    // Ensure no couples are matched
    Object.entries(couples).some(([u1, u2]) =>
      round1.some(
        ([v1, v2]) => (u1 === v1 && u2 === v2) || (u1 === v2 && u2 === v1)
      )
    )
  );

  return formatMatches(round1, round2);
};

const formatMatches = (round1, round2) => {
  const matches1 = {};
  const matches2 = {};

  for (const [u1, u2] of round1) {
    matches1[u1] = u2;
  }

  for (const [u1, u2] of round2) {
    matches2[u1] = u2;
  }
  console.log(matches1);
  console.log(matches2);
  return { matches1, matches2 };
};

const matchUsers = async () => {
  const users = await getUsers();
  const userNames = users.map((user) => user.name);
  const { matches1, matches2 } = await generateUniqueMatches(userNames);
  const matchedUserList = users.map((user) => {
    return {
      name: user.name,
      match1: matches1[user.name],
      match2: matches2[user.name],
    };
  });
  console.log(matchedUserList);
  //Save the matches to a CSV file
  var csvData = `name,match1,match2\n`;
  matchedUserList.forEach((user) => {
    csvData += `${user.name},${user.match1},${user.match2}\n`;
  });
  fs.writeFile("matches.csv", csvData, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Matches saved to matches.csv");
    }
  });
};

//Endpoint for creating a new user
const router = express.Router();
router.post("/newUser", async (req, res) => {
  const { name, password } = req.body;
  const users = await getUsers();
  if (users.find((user) => user.name === name)) {
    res.status(400).send("User already exists");
    return;
  }
  //Add the user to the csv file
  // Add the user to the csv file
  const user = { name, password };
  const csvData = `${user.name},${user.password}\n`;
  fs.appendFile("data.csv", csvData, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error writing to CSV file");
    } else {
      res.send("Created new user");
    }
  });
});

router.post("/match", (req, res) => {
  matchUsers();
  res.send("Matched users");
});

router.post("/getMatches", async (req, res) => {
  console.log(req.body);
  const { name, password } = req.body;
  console.log("Finding matches for: ", name);
  const user = await getUsers();
  const foundUser = user.find((user) => user.name === name);
  console.log("Found User: ", foundUser);
  if (!foundUser || foundUser.password !== password) {
    res.status(401).send("Invalid credentials");
  } else {
    const matches = await getMatches();
    const match = matches.find((user) => user.name === name);
    console.log(match);
    if (!match) {
      res.status(404).send("Matches not found");
      return;
    }
    const matchesObj = { match1: match.match1, match2: match.match2 };
    res.send(matchesObj);
  }
});

export default router;
