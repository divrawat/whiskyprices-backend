import Blog from "../models/blog.js"
import Category from "../models/category.js"
import Tag from "../models/tag.js"
import _ from "lodash"
import formidable from "formidable"
import { errorHandler } from "../helpers/dbErrorHandler.js"
import fs from "fs"
import slugify from "slugify"
import User from "../models/user.js"
import striptags from 'striptags';


export const create = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(400).json({
                error: 'Image could not upload'
            });
        }

        const { title, body, slug, mtitle, mdesc, date, categories, tags } = fields;

        if (!title || !title.length) {
            return res.status(400).json({
                error: 'title is required'
            });
        }

        if (!date || !date.length) {
            return res.status(400).json({
                error: 'date is required'
            });
        }

        if (!slug || !slug.length) {
            return res.status(400).json({
                error: 'slug is required'
            });
        }


        if (!body || body.length < 200) {
            return res.status(400).json({
                error: 'Content is too short'
            });
        }

        if (!categories || categories.length === 0) {
            return res.status(400).json({
                error: 'At least one category is required'
            });
        }

        if (!tags || tags.length === 0) {
            return res.status(400).json({
                error: 'At least one tags is required'
            });
        }

         

        let blog = new Blog();
        blog.title = title;
        blog.body = body;

        blog.slug = slugify(slug).toLowerCase();
        blog.mtitle = mtitle;
        blog.mdesc = mdesc;


        blog.date = date;

        const strippedContent = striptags(body);
        const excerpt0 = strippedContent.slice(0, 150);
        blog.excerpt = excerpt0;



        blog.postedBy = req.auth._id;
        // categories and tags
        let arrayOfCategories = categories && categories.split(',');
        let arrayOfTags = tags && tags.split(',');

        // blog.categories = arrayOfCategories;
        // blog.tags = arrayOfTags;

// if(!files.photo){
//     blog.photo=""
// }


        if (files.photo) {
            if (files.photo.size > 10000000) {
                return res.status(400).json({
                    error: 'Image should be less then 1mb in size'
                });
            }

            blog.photo.data = fs.readFileSync(files.photo.filepath);
            blog.photo.contentType = files.photo.type;
        }




        blog.save((err, result) => {
            if (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }


            // res.json(result);

            Blog.findByIdAndUpdate(result._id, { $push: { categories: arrayOfCategories } }, { new: true }).exec(
                (err, result) => {
                    if (err) {
                        return res.status(400).json({
                            error: errorHandler(err)
                        });
                    } else {
                        Blog.findByIdAndUpdate(result._id, { $push: { tags: arrayOfTags } }, { new: true }).exec(
                            (err, result) => {
                                if (err) {
                                    return res.status(400).json({
                                        error: errorHandler(err)
                                    });
                                } else {
                                    res.json(result);
                                }
                            }
                        );
                    }
                }
            );

        });

    });
};




export const update = (req, res) => {
    const slug = req.params.slug.toLowerCase();


    Blog.findOne({ slug }).exec((err, oldBlog) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }


        let form = new formidable.IncomingForm();
        form.keepExtensions = true;

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(400).json({
                    error: 'Image could not upload'
                });
            }

            
            oldBlog = _.merge(oldBlog, fields);

            const { body, slug, categories, tags } = fields;

            if (slug) { oldBlog.slug = slugify(slug).toLowerCase(); }

            const strippedContent = striptags(body);
            const excerpt0 = strippedContent.slice(0, 150);
            if (body) { oldBlog.excerpt = excerpt0; 
                oldBlog.body = body; }


            if (categories) { oldBlog.categories = categories.split(',') }
            if (tags) { oldBlog.tags = tags.split(','); }


            if (files.photo) {
                if (files.photo.size > 10000000) {
                    return res.status(400).json({
                        error: 'Image should be less then 1mb in size'
                    });
                }
                oldBlog.photo.data = fs.readFileSync(files.photo.filepath);
                oldBlog.photo.contentType = files.photo.type;
            }

            oldBlog.save((err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                // result.photo = undefined;
                res.json(result);
            });
        });
    });
};





// list, listAllBlogsCategoriesTags, read, remove, update

export const allblogs = (req,res)=>{
    Blog.find({}).sort({ date: -1 })
    .select('_id slug date')
    .exec((err, data) => {
        if (err) {
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json(data);
    });
}
 

export const feeds = (req,res)=>{
    Blog.find({}).sort({ date: -1 })
    .populate('postedBy', '_id name username')
    .select('_id title excerpt mdesc slug date body postedBy')
    .limit(7) 
    .exec((err, data) => {
        if (err) {
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json(data);
    });
}


  




export const list = (req, res) => {
    Blog.find({})
        .populate('postedBy', '_id name username').sort({ date: -1 })
        .select('_id title slug categories tags date postedBy')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            res.json(data);
        });
};


export const listAllBlogsCategoriesTags = (req, res) => {

    let blogs;
    let categories;
    let tags;

    Blog.find({}).sort({ date: -1 })
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username profile')
        .select('_id title slug excerpt categories date tags postedBy')
        .exec((err, data) => {
            if (err) {
                return res.json({
                    error: errorHandler(err)
                });
            }
            blogs = data; // blogs
            // get all categories
            Category.find({}).exec((err, c) => {
                if (err) {
                    return res.json({
                        error: errorHandler(err)
                    });
                }
                categories = c; // categories
                // get all tags
                Tag.find({}).exec((err, t) => {
                    if (err) {
                        return res.json({
                            error: errorHandler(err)
                        });
                    }
                    tags = t;
                    // return all blogs categories tags
                    res.json({ blogs, categories, tags, size: blogs.length });
                });
            });
        });
};




export const read = (req, res) => {
    const slug = req.params.slug.toLowerCase();
    Blog.findOne({ slug })
        // .select("-photo")
        .populate('categories', '_id name slug')
        .populate('tags', '_id name slug')
        .populate('postedBy', '_id name username')
        .select('_id title body slug mtitle mdesc date categories tags postedBy')
        .exec((err, data) => {
            if (err) {
                // return res.json({
                //     error: errorHandler(err)
                // });
                return res.status(404).json({
                    error: 'Blogs not found'
                });
            }
            res.json(data);
        });
};

export const remove = (req, res) => {
    const slug = req.params.slug.toLowerCase();
    Blog.findOneAndRemove({ slug }).exec((err, data) => {
        if (err) {
            return res.json({
                error: errorHandler(err)
            });
        }
        res.json({
            message: 'Blog deleted successfully'
        });
    });
};




export const photo = (req, res) => {

    const slug = req.params.slug.toLowerCase();
    Blog.findOne({ slug })
        .select('photo')
        .exec((err, blog) => {

            if (err || !blog) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.set('Content-Type', blog.photo.contentType);
            return res.send(blog.photo.data);
        });
};


export const listRelated = (req, res) => {
    // let limit = req.body.limit ? parseInt(req.body.limit) : 6;
    const { _id, categories } = req.body.blog;

    Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
        .limit(6)
        .populate('postedBy', '_id name username')
        .select('title slug date postedBy')
        .exec((err, blogs) => {
            if (err) {
                return res.status(400).json({
                    error: 'Blogs not found'
                });
            }
            res.json(blogs);
        });
};

export const listSearch = (req, res) => {
    const { search } = req.query;
    if (search) {
        Blog.find(
            {
                $or: [{ title: { $regex: search, $options: 'i' } }, { body: { $regex: search, $options: 'i' } }]
            },
            (err, blogs) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(blogs);
            }
        ).select('-photo -body');
    }
};


export const listByUser = (req, res) => {
    User.findOne({ username: req.params.username }).exec((err, user) => {
        if (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        let userId = user._id;
        Blog.find({ postedBy: userId })
        .populate('postedBy', '_id name')
            .select('_id title date postedBy slug')
            .exec((err, data) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                res.json(data);
            });
    });
};