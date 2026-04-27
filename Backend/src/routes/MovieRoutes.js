import express, { Router } from "express";

const router = Router(); // ✅ CRITICAL: Must initialize the router instance

const app = express();
app.use(express.json());

router.get("/getMovies",(req, res) => {

    const movies = [
        { id: 1, title: "The Shawshank Redemption", year: 1994 },
        { id: 2, title: "The Godfather", year: 1972 },
        { id: 3, title: "The Dark Knight", year: 2008 },
    ];
    res.json({ movies });
});

export default router;