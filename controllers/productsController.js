const prisma = require('../prisma/index')
const parserToken = require('../helpers/parserToken')

exports.find = async (req, res, next) => {
    try {
        const products = await prisma.products.findUnique({
            where: req.query,
            select: {
                id: true,
                name: true,
                quantity: true,
                category: true,
                price: true,
                place: true,
                created_at: true,
                purchase_list_id: true
            },
        })

        res.status(200).json({
            success: true,
            products
        })
    } catch (error) {
        // Verifica se o erro é devido a um ID inválido
        if (error.message.includes('Malformed ObjectID')) {
            return next(new Error('ID do produto inválido. Verifique se o ID está no formato correto.'))
        }

        // Outros erros
        throw new Error(error)
    }

}

exports.findListProducts = async (req, res, next) => {
    try {
        const { id } = req.query
        if (!id) return next(new Error('Informe um id da lista'));

        const { userId } = parserToken(req.headers.authorization)
        const { Products } = await prisma.purchaseList.findUnique({
            where: {
                delete: false,
                OR: [
                    {
                        created_by_id: userId,
                    },
                    {
                        shared_ids: {
                            has: userId
                        }
                    }
                ],
                id: id
            },
            select: {
                Products: true
            }
        })

        const list = Products.reduce((result, product) => {
            const category = product.category;

            if (!result.find((item) => item.category === category)) {
                result.push({
                    category: category,
                    products: [],
                });
            }

            const categoryItem = result.find((item) => item.category === category);
            categoryItem.products.push({
                id: product.id,
                name: product.name,
                quantity: product.quantity,
                category: product.category,
                price: product.price,
                place: product.place,
            });

            return result;
        }, [])

        res.status(200).json({
            success: true,
            list
        })
    } catch (error) {
        // Verifica se o erro é devido a um ID inválido
        if (error.message.includes('Malformed ObjectID')) {
            return next(new Error('ID do produto inválido. Verifique se o ID está no formato correto.'))
        }

        // Outros erros
        throw new Error(error)
    }

}

exports.create = async (req, res, next) => {
    try {
        const validFields = ['purchase_list_id', 'name', 'quantity', 'category', 'price', 'place'];
        if (!Object.entries(req.body).every(([key, data]) => data !== undefined && data !== null && data !== '' && validFields.includes(key))) {
            return next(new Error('Campos obrigatorios devem estar presente no objeto: purchase_list_id, name, quantity, category, price, place'))
        }

        const { purchase_list_id } = req.body
        // Verificar se a lista é existente.
        const list = await prisma.purchaseList.findUnique({
            where: {
                id: purchase_list_id,
            },
        })

        if (list) {
            const user = parserToken(req.headers.authorization)

            const product = await prisma.products.create({
                data: {
                    ...req.body,
                    created_by_id: user.userId
                },
            })

            res.status(200).json({
                success: true,
                product
            })
        } else {
            return next(new Error('Lista de compras não encontrada.'))
        }

    } catch (error) {
        throw new Error(error)
    }

}

exports.update = async (req, res, next) => {
    try {
        const { id } = req.query
        // Check
        if (!id) return next(new Error('Informe um id'));

        if (Object.keys(req.body).length == 0) return next(new Error('Nenhum dado informado.'))

        const validFields = ['name', 'quantity', 'category', 'price', 'place', 'checked'];
        if (!Object.entries(req.body).some(([key, data]) => data !== undefined && data !== null && data !== '' && validFields.includes(key))) {
            return next(new Error('Pelo menos um dos campos válidos deve estar presente no objeto: name, color, icon, concluded, deleted, total'))
        }

        // Verifica se no body possui o checked e adicona o id do usuario no checked_by_Id
        if (req.body.checked == true) {
            const { userId } = parserToken(req.headers.authorization)
            req.body.checked_by_id = userId
        } else {
            req.body.checked_by_id = null
        }

        const update = await prisma.products.update({
            where: {
                id,
            },
            data: req.body
        })

        res.status(200).json({
            success: true,
            update
        })
    } catch (error) {
        // Verifica se o erro é devido a um ID inválido
        if (error.message.includes('Malformed ObjectID')) {
            return next(new Error('ID do produto inválido. Verifique se o ID está no formato correto.'))
        }

        // Outros erros
        throw new Error(error)
    }

}

exports.destroy = async (req, res, next) => {
    try {
        const { id } = req.query
        // Check
        if (!id) return next(new Error('Informe o id do produto'));

        // Verificar se o produto é existente
        const product = await prisma.products.findUnique({
            where: {
                id,
            },
        })

        const { userId } = parserToken(req.headers.authorization)
        if (userId !== product.created_by_id) return next(new Error('Você não possui permissão para deletar este produto.'))

        await prisma.products.delete({
            where: {
                id
            }
        })

        res.status(200).json({
            success: true,
            message: 'Produto deletado.'
        })
    } catch (error) {
        // Verifica se o erro é devido a um ID inválido
        if (error.message.includes('Malformed ObjectID')) {
            return next(new Error('ID do produto inválido. Verifique se o ID está no formato correto.'))
        }

        // Outros erros
        throw new Error(error)
    }

}