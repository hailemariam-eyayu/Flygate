import { prisma } from "../config/db";


const addToWatchList = async (req, res) => {

    const { movieId, status, rating, notes, userId } = req.body;

    // verify movies exist or not

    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
    });

    if (!movie) {
        return res.status(404).json({ error: "Movie Not Found" });
    }

    // check if it already there
    const existingList = await prisma.watchlistItem.findUnique({
        where: {
            userId_movieId: {
                userId: userId,
                movieId: movieId,
            },
        },
    });

    if (!movie) {
        return res.status(404).json({ error: "Movie already in the list" });
    }

    //adding
    const watchlistItem = await prisma.watchlistItem.create({
        data: {
            userId,
            movieId,
            status: status || "PLANNED",
            rating,
            notes,
        },
    });

    res.status(201).json({
        status: "Success",
        data: {
            watchlistItem,
        },
    });
};


export {addToWatchList};