import Blog from "../models/blog.js"
import _ from "lodash"
import formidable from "formidable"
import { errorHandler } from "../helpers/dbErrorHandler.js"
import slugify from "slugify"
import User from "../models/user.js"
import striptags from 'striptags';
import "dotenv/config.js";


export const create = async (req, res) => {
    try {
        const form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, async (err, fields, files) => {
            if (err) { return res.status(400).json({ error: 'Image could not upload' }); }

            const { title, body, slug, mtitle, mdesc, date, categories, photo } = fields;

            if (!title || !title.length) { return res.status(400).json({ error: 'title is required' }) }
            if (!date || !date.length) { return res.status(400).json({ error: 'date is required' }) }
            if (!slug || !slug.length) { return res.status(400).json({ error: 'slug is required' }) }
            if (!mtitle || !mtitle.length) { return res.status(400).json({ error: 'mtitle is required' }) }
            if (!mdesc || !mdesc.length) { return res.status(400).json({ error: 'mdesc is required' }) }
            if (!body || body.length < 200) { return res.status(400).json({ error: 'Content is too short' }) }
            if (!categories || categories.length === 0) { return res.status(400).json({ error: 'At least one category is required' }) }

            let blog = new Blog();
            let strippedContent = striptags(body);
            let excerpt0 = strippedContent.slice(0, 150);
            let arrayOfCategories = categories && categories.split(',');
            blog.title = title;
            blog.body = body;
            blog.slug = slugify(slug).toLowerCase();
            blog.mtitle = mtitle;
            blog.mdesc = mdesc;
            blog.date = date;
            blog.photo = photo;
            blog.excerpt = excerpt0;
            blog.postedBy = req.auth._id;
            await blog.save();
            const updatedBlog = await Blog.findByIdAndUpdate(blog._id, { $push: { categories: arrayOfCategories } }, { new: true }).exec();
            await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/${blog.slug}`, { method: 'POST' });
            await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/`, { method: 'POST' });
            res.json(updatedBlog);
        });
    } catch (error) { res.status(400).json({ "Error": "Something Went Wrong" }) }
};




export const update = async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        const oldBlog = await Blog.findOne({ slug });

        if (!oldBlog) { return res.status(404).json({ error: 'Blog not found' }); }

        const form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, async (err, fields, files) => {
            if (err) { return res.status(400).json({ error: 'Image could not upload' }); }

            _.merge(oldBlog, fields);

            const { title, mtitle, mdesc, body, categories, slug } = fields;

            if (mtitle === '') { return res.status(400).json({ error: 'MTitle is required' }) }
            if (title === '') { return res.status(400).json({ error: 'title is required' }) }
            if (mdesc === '') { return res.status(400).json({ error: 'Mdesc is required' }) }
            if (slug) { oldBlog.slug = slugify(slug).toLowerCase(); }

            const strippedContent = striptags(body);
            const excerpt = strippedContent.slice(0, 150);
            if (body) { oldBlog.excerpt = excerpt; }
            if (categories) { oldBlog.categories = categories.split(',').map(category => category.trim()) }

            const result = await oldBlog.save();
            res.json(result);

            await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/${result.slug}`, { method: 'POST' });
            await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/`, { method: 'POST' });

        });
    } catch (error) { return res.status(500).json({ error: 'Internal Server Error' }) }

};




export const remove = async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        const data = await Blog.findOneAndRemove({ slug }).exec();
        if (!data) { return res.json({ error: 'Blog not found' }); }
        res.json({ message: 'Blog deleted successfully' });
        await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/${slug}`, { method: 'POST' });
        await fetch(`${process.env.MAIN_URL}/api/revalidate?path=/`, { method: 'POST' })
    } catch (error) { res.json({ "error": "Something went wrong" }) }
};



export const allblogs = async (req, res) => {
    try {
        const data = await Blog.find({}).sort({ date: -1 }).select('_id slug date').exec();    
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};

export const allblogslugs = async (req, res) => {
    try {
        const data = await Blog.find({}).select('slug').exec();
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};

export const feeds = async (req, res) => {
    try {
        const data = await Blog.find({}).sort({ date: -1 })
            .populate('postedBy', '_id name username').select('_id title excerpt mdesc slug date body postedBy').limit(7) .exec();    
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};

export const list = async (req, res) => {
    try {
        const data = await Blog.find({})
            .populate('postedBy', '_id name username').sort({ date: -1 }).select('_id title slug categories tags date postedBy').exec();  
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};

export const listAllBlogsCategoriesTags = async (req, res) => {
    try {
        const blogs = await Blog.find({}).sort({ date: -1 })
            .populate('categories', '_id name slug').populate('tags', '_id name slug')
            .populate('postedBy', '_id name username profile').select('_id title photo slug excerpt categories date tags postedBy') .exec();
        res.json({ blogs, size: blogs.length });
    } catch (err) { res.json({ error: errorHandler(err) }); }
};



export const read = async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        const data = await Blog.findOne({ slug })
            .populate('categories', '_id name slug').populate('tags', '_id name slug').populate('postedBy', '_id name username')
            .select('_id photo title body slug mtitle mdesc date categories tags postedBy') .exec();
        if (!data) { return res.status(404).json({ error: 'Blogs not found' }); }
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};



export const listRelated = async (req, res) => {
    try {
        const { _id, categories } = req.body.blog;
        const blogs = await Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
            .limit(6).populate('postedBy', '_id name username').select('title slug date photo postedBy').exec();
        res.json(blogs);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};



export const listSearch = async (req, res) => {
    const { search } = req.query;
    if (search) {
        Blog.find({
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' }
                }
            ]
        }).select('-photo -body').exec((err, blogs) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json(blogs);
        });
    }
};



export const listByUser = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).exec();
        if (!user) { return res.status(400).json({ error: 'User not found' }); }
        const userId = user._id;
        const data = await Blog.find({ postedBy: userId }).populate('postedBy', '_id name').select('_id title date postedBy slug').exec();
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};