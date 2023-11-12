import Blog from "../models/blog.js";
import multer from 'multer';
const upload = multer({});
import { errorHandler } from "../helpers/dbErrorHandler.js";
import slugify from "slugify";
import User from "../models/user.js";
import striptags from 'striptags';
import "dotenv/config.js";


export const create = async (req, res) => {
    upload.none()(req, res, async (err) => {
      if (err) { return res.status(400).json({ error: 'Something went wrong' }) }
      const { title, description, slug, photo, categories, mtitle, mdesc, date, body } = req.body;
  
      if (!categories || categories.length === 0) { return res.status(400).json({ error: 'At least one category is required' }) }
  
      let blog = new Blog();
      blog.title = title;
      blog.slug = slugify(slug).toLowerCase();
      blog.description = description;
      blog.mtitle = mtitle;
      blog.mdesc = mdesc;
      blog.photo = photo;
      blog.date = date;
      blog.body = body;
      blog.postedBy = req.auth._id;
      let strippedContent = striptags(body);
      let excerpt0 = strippedContent.slice(0, 150);
      blog.excerpt = excerpt0;
      try {
        let arrayOfCategories = categories && categories.split(',');
        await blog.save();
        const updatedBlog = await Blog.findByIdAndUpdate(blog._id, { $push: {categories: { $each: arrayOfCategories }
        } }, { new: true }).exec();
        res.json(updatedBlog);
        fetch(`${process.env.MAIN_URL}/api/revalidate?path=/${blog.slug}`, { method: 'POST' })
        fetch(`${process.env.MAIN_URL}/api/revalidate?path=/`, { method: 'POST' })
      } catch (error) { return res.status(500).json({ error: "Slug should be unique" }) }
    });
  };


export const update = async (req, res) => {

    upload.none()(req, res, async (err) => {
      if (err) { return res.status(400).json({ error: 'Something went wrong' }) }
  
      const updateFields = req.body;
  
      try {
        const slug = req.params.slug.toLowerCase();
        if (!slug) { return res.status(404).json({ error: 'Blog not found' }) }
  
        let blog = await Blog.findOne({ slug }).exec();
  
        Object.keys(updateFields).forEach((key) => {
          if (key === 'title') { blog.title = updateFields.title; }
          else if (key === 'description') { blog.description = updateFields.description; }
          else if (key === 'mtitle') { blog.mtitle = updateFields.mtitle; }
          else if (key === 'mdesc') { blog.mdesc = updateFields.mdesc; }
          else if (key === 'date') { blog.date = updateFields.date; }
          else if (key === 'body') { blog.body = updateFields.body; }
          else if (key === 'categories') { blog.categories = updateFields.categories.split(',').map(category => category.trim()); }
          else if (key === 'excerpt') { blog.excerpt = updateFields.strippedContent.slice(0, 150);} 
          else if (key === 'slug') { blog.slug = slugify(updateFields.slug).toLowerCase(); }
          else if (key === 'photo') { blog.photo = updateFields.photo; }
        });
        const savedBlog = await blog.save();

         fetch(`${process.env.MAIN_URL}/api/revalidate?path=/${blog.slug}`, { method: 'POST' });
         fetch(`${process.env.MAIN_URL}/api/revalidate?path=/`, { method: 'POST' });
         
        return res.status(200).json(savedBlog);
      } catch (error) {
        console.error("Error updating Blog:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    });
    
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
            .populate('postedBy', '_id name username').sort({ date: -1 }).select('_id title slug categories date postedBy').exec();  
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};



export const listAllBlogsCategoriesTags = async (req, res) => {
    try {
        const blogs = await Blog.find({}).sort({ date: -1 })
            .populate('categories', '_id name slug')
            .populate('postedBy', '_id name username').select('_id title photo slug excerpt categories date postedBy') .exec();
        res.json({ blogs, size: blogs.length });
    } catch (err) { res.json({ error: errorHandler(err) }); }
};



export const read = async (req, res) => {
    try {
        const slug = req.params.slug.toLowerCase();
        const data = await Blog.findOne({ slug })
            .populate('categories', '_id name slug').populate('postedBy', '_id name username')
            .select('_id photo title body slug mtitle mdesc date categories postedBy') .exec();
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


export const listByUser = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).exec();
        if (!user) { return res.status(400).json({ error: 'User not found' }); }
        const userId = user._id;
        const data = await Blog.find({ postedBy: userId }).populate('postedBy', '_id name').select('_id title date postedBy slug').exec();
        res.json(data);
    } catch (err) { res.json({ error: errorHandler(err) }); }
};