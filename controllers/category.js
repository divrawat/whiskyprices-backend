import Category from '../models/category.js';
import slugify from "slugify"
import { errorHandler } from "../helpers/dbErrorHandler.js"
import Blog from "../models/blog.js"


export const create = async (req, res) => {
    const { name, description } = req.body;
    const slug = slugify(name).toLowerCase();
    try {
        const category = new Category({ name, description, slug });
        const data = await category.save();
        res.json(data);
    } catch (err) {res.status(400).json({ error: errorHandler(err)});}  
};


export const list = async (req, res) => {
    try {
        const data = await Category.find({}).exec();
        res.json(data);
    } catch (err) {res.status(400).json({error: errorHandler(err)});}  
};


export const read = async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    try {
        const category = await Category.findOne({ slug }).exec();
        if (!category) {return res.status(400).json({error: 'Category not found'}); }

        const blogs = await Blog.find({ categories: category })
            .populate('categories', '_id name slug')
            .populate('tags', '_id name slug')
            .populate('postedBy', '_id name username')
            .select('_id title slug excerpt categories date postedBy tags')
            .exec();
        res.json({ category, blogs });
    } catch (err) {res.status(400).json({error: errorHandler(err)}); }   
};

export const remove = async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    try {
        const data = await Category.findOneAndRemove({ slug }).exec();
        if (!data) {  return res.status(400).json({error: 'Category not found' }); }
        res.json({message: 'Category deleted successfully'});
    } catch (err) {res.status(400).json({error: errorHandler(err)});}   
};