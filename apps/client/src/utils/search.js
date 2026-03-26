import axios from "axios"
import { getBackend } from "./network"

const briefSearchAll = async searchTerm => {
    try {
        const res = await axios.get (`${getBackend ()}/search/all/${encodeURIComponent(searchTerm)}`);
        return res.data;
    } catch (error) {
        // console.log (error);
        return {
            collections: [],
            users: [],
            totals: {
                collections: 0,
                users: 0,
            },
            insight: null,
        }
    }
}

const fetchUsersPaginated = async (searchTerm, page = 1, perPage = 10) => {
    try {
        const res = await axios.get (`${getBackend ()}/search/users/${encodeURIComponent(searchTerm)}?page=${page}&perPage=${perPage}`);
        return res.data;
    } catch (error) {
        return {
            users: [],
            total: 0,
            insight: null,
        }
    }
}

const fetchCollectionsPaginated = async (searchTerm, page = 1, perPage = 10) => {
    try {
        const res = await axios.get (`${getBackend ()}/search/collections/${encodeURIComponent(searchTerm)}?page=${page}&perPage=${perPage}`);
        return res.data;
    } catch (error) {
        return {
            collections: [],
            total: 0,
            insight: null,
        }
    }
}

export {
    briefSearchAll,
    fetchUsersPaginated,
    fetchCollectionsPaginated
}
