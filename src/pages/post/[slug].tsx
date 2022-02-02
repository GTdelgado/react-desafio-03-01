/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
/* eslint-disable react/no-danger */
import { GetStaticPaths, GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <>
        <Header />
        <div className={styles.loading}>Carregando...</div>
      </>
    );
  }

  const formatedPost: Post = {
    first_publication_date: format(
      new Date(post.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      author: post.data.author,
      title: post.data.title,
      banner: {
        url: post.data.banner.url,
      },
      content: post.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  const totalWords = formatedPost.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;
    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Header />
      <img
        src={formatedPost.data.banner.url}
        alt={formatedPost.data.title}
        className={styles.banner}
      />
      <div className={styles.container}>
        <div className={styles.formatedPost}>
          <h1>{formatedPost.data.title}</h1>
          <div className={styles.info}>
            <time>
              <FiCalendar /> {formatedPost.first_publication_date}
            </time>
            <span>
              <FiUser /> {formatedPost.data.author}
            </span>
            <span>
              <FiClock /> {readTime} min
            </span>
          </div>
          <div className={styles.content}>
            {formatedPost.data.content.map(content => {
              return (
                <>
                  <h2 key={content.heading}>{content.heading}</h2>
                  <div
                    className={styles.contentBody}
                    dangerouslySetInnerHTML={{
                      __html: RichText.asHtml(content.body),
                    }}
                  />
                </>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic
    .query([Prismic.predicates.at('document.type', 'posts')], {
      pageSize: 100,
    })
    .then(reponse => reponse.results.map(post => post.uid));

  return {
    paths: posts.map(post => {
      return {
        params: { slug: post },
      };
    }),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  return {
    props: {
      post: response,
    },
    redirect: 60 * 60 * 4, // 4 Hours
  };
};
