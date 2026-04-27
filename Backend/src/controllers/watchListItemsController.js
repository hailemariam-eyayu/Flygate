import { prisma } from "../config/db.js";


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


const updateWatchlist = async (req, res) => {

    const {status, rating, notes } = req.body;

    //Find watchlist item and verify ownership
    const watchlistItem = await prisma.watchlistItem.findUnique({
        where: { id: req.params.id },
    });

    if (!watchlistItem) {
        return res.status(404).json({ error: "watchlist item not found " });
    }

    // Ensure only owner can delete
    if (watchlistItem.userId !== req.user.id) {
        return res.status(403)
            .json({ error: "not allowed to update this watchlist item" })
    }

    // Build update data
    const updatedData = {};
    if(status !==undefined) updatedData.status = status.toUpperCase();
    if(rating !==undefined) updatedData.rating = rating;
    if(notes !==undefined) updatedData.notes = notes;
    
    // update watchlist item
    const updateItem = await prisma.watchlistItem.update({
        where: { id: req.params.id },
        data: updatedData,
    });

    res.status(200).json({
        status: "Success",
        data: {
            watchlistItem: updateItem,
        },
    });
};


const removeFromWatchlist = async (req, res) => {
    //Find watchlist item and verify ownership
    const watchlistItem = await prisma.watchlistItem.findUnique({
        where: { id: req.params.id },
    });

    if (!watchlistItem) {
        return res.status(404).json({ error: "watchlist item not found " });
    }

    // Ensure only owner can delete
    if (watchlistItem.userId !== req.user.id) {
        return res.status(403)
            .json({ error: "not allowed to delete this watchlist item" })
    }
    await prisma.watchlistItem.delete({
        where: { id: req.params.id },
    });

    res.status(200).json({
        status: "Success",
        message: "Movie removed from watchlist",
    });
};


export { addToWatchList, removeFromWatchlist, updateWatchlist };