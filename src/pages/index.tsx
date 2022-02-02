import { GetStaticProps } from 'next';

import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import styles from './home.module.scss';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const postsFormatados = postsPagination.results.map(post => {
    return {
      ...post,
      first_publication_date: format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      ),
    };
  });

  const [posts, setPosts] = useState<Post[]>(postsFormatados);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);

  async function handleLoadMore(): Promise<void> {
    if (nextPage === null) {
      return null;
    }

    const newPosts = await fetch(nextPage).then(response => response.json());
    setNextPage(newPosts.next_page);
    const formatedNewsPosts: Post[] = newPosts.results.map(p => {
      return {
        uid: p.uid,
        first_publication_date: format(
          new Date(p.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
        data: {
          author: p.data.author,
          title: p.data.title,
          subtitle: p.data.subtitle,
        },
      };
    });

    setPosts([...posts, ...formatedNewsPosts]);

    return newPosts;
  }

  return (
    <>
      <Header />
      <div className={styles.content}>
        {posts.map(post => {
          return (
            <div className={styles.posts} key={post.uid}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <h1>{post.data.title}</h1>
                  <p>{post.data.subtitle}</p>
                  <div>
                    <time>
                      <FiCalendar /> {post.first_publication_date}
                    </time>
                    <span>
                      <FiUser /> {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            </div>
          );
        })}
        {nextPage ? (
          <button
            type="button"
            className={styles.loadMore}
            onClick={handleLoadMore}
          >
            Carregar mais posts
          </button>
        ) : (
          ''
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(p => {
    return {
      uid: p.uid,
      first_publication_date: p.first_publication_date,
      data: {
        author: p.data.author,
        title: p.data.title,
        subtitle: p.data.subtitle,
      },
    };
  });

  const postsPagination: PostPagination = {
    results: posts,
    next_page: postsResponse.next_page,
  };

  return {
    props: {
      postsPagination,
    },
    revalidate: 60 * 30, // 60 minutes,
  };
};
