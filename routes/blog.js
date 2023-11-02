import express from "express";
const router = express.Router();
import { create, list, listAllBlogsCategoriesTags, read, remove, update, listRelated, allblogs, feeds, allblogslugs } from "../controllers/blog.js"
import { requireSignin, adminMiddleware } from "../controllers/auth.js"

router.post('/blog', requireSignin, adminMiddleware, create);
router.get('/blogs', list);
router.get('/allblogs', allblogs)
router.get('/rss', feeds)
router.get('/blogs-categories-tags', listAllBlogsCategoriesTags);
router.get('/blog/:slug', read);
router.delete('/blog/:slug', requireSignin, adminMiddleware, remove);
router.put('/blog/:slug', requireSignin, adminMiddleware, update);
router.post('/blogs/related', listRelated);
router.get('/allblogslugs', allblogslugs);



export default router

